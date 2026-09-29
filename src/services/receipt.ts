import { today } from '@/domain/dates';
import type { NewPantryItem } from '@/domain/types';
import { draftFromName } from '@/store/pantry';

/**
 * Receipt scanning. Reading a photo needs an OCR/AI service that holds its API key server-side,
 * so the app posts the image to EXPO_PUBLIC_RECEIPT_API_URL, which should respond with:
 *   { store?: string, date?: "yyyy-mm-dd", lines: [{ name: string, priceCents?: number, quantity?: number }] }
 * Turning those lines into pantry items (non-food filtering, shelf life) happens on-device.
 */
const endpoint = process.env.EXPO_PUBLIC_RECEIPT_API_URL;

export const receiptScanningAvailable = !!endpoint;

export type ReceiptLine = { name: string; priceCents?: number; quantity?: number };
export type ParsedReceipt = { store?: string; date?: string; lines: ReceiptLine[] };

export class ReceiptServiceUnavailable extends Error {
  constructor() {
    super('Receipt scanning is not connected yet');
  }
}

export async function readReceipt(image: { uri: string; base64?: string }): Promise<ParsedReceipt> {
  if (!endpoint) throw new ReceiptServiceUnavailable();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: image.base64, uri: image.base64 ? undefined : image.uri }),
  });
  if (!response.ok) throw new Error(`Receipt service error (${response.status})`);
  return (await response.json()) as ParsedReceipt;
}

/** Household goods that show up on grocery receipts but aren't food. */
const NON_FOOD =
  /paper towel|toilet|tissue|napkin|detergent|soap|shampoo|conditioner|toothpaste|foil|plastic wrap|trash bag|bag fee|batter(y|ies)|sponge|bleach|cleaner|diaper|\bbag\b/i;

export type ReceiptDraft = { draft: NewPantryItem; excluded: boolean };

/** Receipt lines → pantry drafts, with non-food items pre-excluded (Stitch "Smart filter"). */
export function draftsFromReceipt(receipt: ParsedReceipt): ReceiptDraft[] {
  const purchasedOn = receipt.date ?? today();
  return receipt.lines
    .filter((line) => line.name.trim().length > 1)
    .map((line) => ({
      excluded: NON_FOOD.test(line.name),
      draft: draftFromName(tidyName(line.name), {
        purchasedOn,
        priceCents: line.priceCents,
        quantity: line.quantity ?? 1,
        source: 'receipt',
      }),
    }));
}

/** "ORG BABY SPINACH 5OZ" → "Org Baby Spinach 5oz" */
function tidyName(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/(\d)(Oz|Lb|Ct|Pk|G|Ml)\b/g, (_, digit: string, unit: string) => digit + unit.toLowerCase());
}
