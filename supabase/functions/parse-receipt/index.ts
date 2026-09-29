// Reads a grocery receipt photo with Claude and returns the food line items.
//
// POST { image: <base64 JPEG/PNG/WebP>, mediaType?: "image/jpeg" }
//   → 200 { store, date, lines: [{ name, priceCents, quantity, isFood }] }
// Requires a signed-in user (Supabase JWT). The Anthropic key never leaves this function.
//
// Secrets: ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=...).
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const DAILY_LIMIT = 25;
// Claude accepts images up to 5 MB; base64 inflates by ~4/3.
const MAX_BASE64_LENGTH = Math.floor((5 * 1024 * 1024 * 4) / 3);
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You read photos of grocery receipts for Expiry Radar, an app that tracks food so it gets eaten before it spoils.

Extract every purchased product line from the receipt:
- name: a plain, readable product name. Expand store abbreviations ("ORG BBY SPNCH 5OZ" becomes "Organic Baby Spinach 5 oz", "GRK YGRT PLN" becomes "Greek Yogurt Plain"). Keep brand names when printed. Do not invent products that are not on the receipt.
- quantity: how many units were bought (from "2 @ 1.99" or a quantity column). Use 1 when not shown. For items sold by weight, use 1.
- price_cents: the line total in cents (e.g. 3.99 becomes 399), or null if unreadable.
- is_food: true for food and drink; false for household goods (paper towels, detergent, soap), bags, bottle deposits, gift cards and similar.

Leave out subtotal, tax, total, discounts, coupons, loyalty savings, payment, change and card lines entirely. If a discount line clearly belongs to one product, subtract it from that product's price_cents.

store is the store name as printed (or null). date is the purchase date as YYYY-MM-DD (or null if not printed or unreadable).
If the image is not a receipt, set is_receipt to false and return an empty lines list.`;

const RECEIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_receipt', 'store', 'date', 'lines'],
  properties: {
    is_receipt: { type: 'boolean' },
    store: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    date: { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'quantity', 'price_cents', 'is_food'],
        properties: {
          name: { type: 'string' },
          quantity: { type: 'integer' },
          price_cents: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          is_food: { type: 'boolean' },
        },
      },
    },
  },
};

type ModelReceipt = {
  is_receipt: boolean;
  store: string | null;
  date: string | null;
  lines: { name: string; quantity: number; price_cents: number | null; is_food: boolean }[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** Keeps only well-formed lines and clamps values the schema can't constrain (no min/max support). */
function normalize(receipt: ModelReceipt) {
  const today = new Date().toISOString().slice(0, 10);
  const date = receipt.date && /^\d{4}-\d{2}-\d{2}$/.test(receipt.date) && receipt.date <= today ? receipt.date : null;
  return {
    store: receipt.store?.trim() || null,
    date,
    lines: receipt.lines
      .map((line) => ({
        name: line.name.trim().slice(0, 80),
        quantity: Math.min(24, Math.max(1, Math.round(line.quantity || 1))),
        priceCents: typeof line.price_cents === 'number' && line.price_cents >= 0 ? Math.round(line.price_cents) : undefined,
        isFood: line.is_food,
      }))
      .filter((line) => line.name.length > 1),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);

  // Identify the caller from their session token (the anon key alone is not enough).
  const authorization = request.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth } = await userClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  const user = auth?.user;
  if (!user) return json({ error: 'Sign in to scan receipts.' }, 401);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'Receipt reading is not configured on the server yet.' }, 503);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await admin
    .from('receipt_scans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `You've scanned ${DAILY_LIMIT} receipts today. Try again tomorrow or scan barcodes.` }, 429);
  }

  let body: { image?: unknown; mediaType?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON: { image: <base64> }' }, 400);
  }
  const image = typeof body.image === 'string' ? body.image.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '') : '';
  const mediaType: MediaType = MEDIA_TYPES.includes(body.mediaType as MediaType) ? (body.mediaType as MediaType) : 'image/jpeg';
  if (!image) return json({ error: 'No image received.' }, 400);
  if (image.length > MAX_BASE64_LENGTH) return json({ error: 'That photo is too large. Try again with a smaller image.' }, 413);

  const { data: scan } = await admin.from('receipt_scans').insert({ user_id: user.id }).select('id').single();

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // Server-side fallback: a false-positive safety decline is retried on the recommended model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Reading a receipt is straightforward extraction, so keep thinking light and fast.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: RECEIPT_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'Extract the purchased items from this receipt.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json({ error: 'This image could not be read as a receipt.' }, 422);
    }
    if (response.stop_reason === 'max_tokens') {
      return json({ error: 'That receipt is very long. Try photographing it in two halves.' }, 422);
    }
    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'No items could be read from this photo.' }, 422);

    const parsed = JSON.parse(text.text) as ModelReceipt;
    if (!parsed.is_receipt) return json({ error: "That doesn't look like a grocery receipt." }, 422);

    if (scan) await admin.from('receipt_scans').update({ succeeded: true }).eq('id', scan.id);
    return json(normalize(parsed));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: 'The receipt reader is busy. Please try again in a minute.' }, 503);
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error('Receipt request rejected', error.message);
      return json({ error: 'That photo could not be processed. Try a clearer JPEG.' }, 422);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}`, error.message);
      return json({ error: 'The receipt reader is unavailable right now.' }, 502);
    }
    if (error instanceof SyntaxError) {
      console.error('Unparseable receipt output', error.message);
      return json({ error: 'No items could be read from this photo.' }, 422);
    }
    throw error;
  }
});
