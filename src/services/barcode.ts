import { findFood } from '@/domain/foods';
import type { CategoryId, NewPantryItem } from '@/domain/types';
import { draftFromName } from '@/store/pantry';

/**
 * Product lookup via Open Food Facts (free, no key). Returns a pantry draft with
 * smart-default expiry, or undefined when the code isn't in the database.
 */
const FIELDS = 'product_name,generic_name,brands,quantity,categories_tags,image_front_small_url';

type OffProduct = {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
  image_front_small_url?: string;
};

const CATEGORY_TAGS: [RegExp, CategoryId][] = [
  [/frozen/, 'frozen'],
  [/dairies|dairy|cheeses|yogurts|milks|eggs/, 'dairy'],
  [/meats|poultry|fishes|seafood|tofu/, 'proteins'],
  [/breads|bakery|pastries|viennoiseries/, 'bakery'],
  [/beverages|drinks|juices|waters|sodas/, 'beverages'],
  [/fruits|vegetables|salads|fresh-produce/, 'produce'],
];

function categoryFromTags(tags: string[] = []): CategoryId {
  const joined = tags.join(' ');
  return CATEGORY_TAGS.find(([pattern]) => pattern.test(joined))?.[1] ?? 'pantry';
}

export async function lookupBarcode(code: string): Promise<NewPantryItem | undefined> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`, {
    headers: { 'User-Agent': 'ExpiryRadar/1.0 (mobile app)' },
  });
  if (!response.ok) {
    if (response.status === 404) return undefined;
    throw new Error(`Product lookup failed (${response.status})`);
  }
  const body = (await response.json()) as { status: number; product?: OffProduct };
  const product = body.product;
  const name = product?.product_name?.trim() || product?.generic_name?.trim();
  if (body.status !== 1 || !product || !name) return undefined;

  const known = findFood(name);
  const brand = product.brands?.split(',')[0]?.trim();
  return draftFromName(name, {
    detail: [brand, product.quantity].filter(Boolean).join(' • ') || undefined,
    category: known?.category ?? categoryFromTags(product.categories_tags),
    image: known?.image ?? product.image_front_small_url,
    barcode: code,
    source: 'barcode',
  });
}
