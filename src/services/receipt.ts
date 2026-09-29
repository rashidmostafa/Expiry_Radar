import { FunctionsHttpError } from '@supabase/supabase-js';

import { today } from '@/domain/dates';
import type { NewPantryItem } from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { draftFromName } from '@/store/pantry';

/**
 * Receipt scanning. The photo goes to the `parse-receipt` Supabase Edge Function, which asks
 * Claude to read it (the API key lives on the server) and returns:
 *   { store?: string, date?: "yyyy-mm-dd", lines: [{ name, priceCents?, quantity?, isFood? }] }
 * Turning those lines into pantry items (non-food filtering, shelf life) happens on-device.
 */
export type ReceiptLine = { name: string; priceCents?: number; quantity?: number; isFood?: boolean };
export type ParsedReceipt = { store?: string | null; date?: string | null; lines: ReceiptLine[] };

/** Thrown when receipt reading can't be used here yet (no cloud project, or not signed in). */
export class ReceiptServiceUnavailable extends Error {
  constructor(readonly reason: 'not-configured' | 'signed-out') {
    super(reason === 'signed-out' ? 'Sign in to scan receipts' : 'Receipt scanning is not connected yet');
  }
}

export class ReceiptReadError extends Error {}

export async function readReceipt(image: { uri: string; base64?: string }): Promise<ParsedReceipt> {
  if (!supabase) throw new ReceiptServiceUnavailable('not-configured');
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new ReceiptServiceUnavailable('signed-out');
  if (!image.base64) throw new ReceiptReadError('Could not read that photo. Please try again.');

  const { data, error } = await supabase.functions.invoke<ParsedReceipt>('parse-receipt', {
    body: { image: image.base64, mediaType: 'image/jpeg' },
  });
  if (error) {
    // The function answers with a friendly { error } message for expected failures.
    const message =
      error instanceof FunctionsHttpError ? ((await error.context.json().catch(() => ({}))) as { error?: string }).error : undefined;
    throw new ReceiptReadError(message ?? 'The receipt reader is unavailable right now.');
  }
  return data ?? { lines: [] };
}

/** Household goods that show up on grocery receipts but aren't food. */
const NON_FOOD =
  /paper towel|toilet|tissue|napkin|detergent|soap|shampoo|conditioner|toothpaste|foil|plastic wrap|trash bag|bag fee|batter(y|ies)|sponge|bleach|cleaner|diaper|\bbag\b/i;

export type ReceiptDraft = { draft: NewPantryItem; excluded: boolean };

/** Receipt lines → pantry drafts, with non-food items pre-excluded (Stitch "Smart filter"). */
export function draftsFromReceipt(receipt: ParsedReceipt): ReceiptDraft[] {
  const purchasedOn = receipt.date || today();
  return receipt.lines
    .filter((line) => line.name.trim().length > 1)
    .map((line) => ({
      excluded: line.isFood === false || NON_FOOD.test(line.name),
      draft: draftFromName(tidyName(line.name), {
        purchasedOn,
        priceCents: line.priceCents,
        quantity: line.quantity ?? 1,
        source: 'receipt',
      }),
    }));
}

/** "ORG BABY SPINACH 5OZ" → "Org Baby Spinach 5oz"; names that already have mixed case are kept. */
function tidyName(raw: string) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/(\d)(Oz|Lb|Ct|Pk|G|Ml)\b/g, (_, digit: string, unit: string) => digit + unit.toLowerCase());
}
