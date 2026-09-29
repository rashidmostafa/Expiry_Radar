export type Zone = 'fridge' | 'freezer' | 'pantry';

export type CategoryId =
  | 'produce'
  | 'dairy'
  | 'proteins'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'beverages'
  | 'other';

export type ItemStatus = 'active' | 'used' | 'tossed';
export type ItemSource = 'manual' | 'barcode' | 'receipt';

export type PantryItem = {
  id: string;
  name: string;
  /** Brand / size line, e.g. "Organic 16oz". */
  detail?: string;
  category: CategoryId;
  zone: Zone;
  /** Where in the zone, e.g. "Crisper Drawer". */
  shelf?: string;
  quantity: number;
  unit: string;
  /** 0–100, how much of the item is still left. */
  remainingPct: number;
  /** ISO dates (yyyy-mm-dd). */
  purchasedOn: string;
  expiresOn: string;
  openedOn?: string;
  priceCents?: number;
  weightGrams?: number;
  /** Bundled image key (see data/images) or a file/http URI. */
  image?: string;
  barcode?: string;
  source: ItemSource;
  notes?: string;
  alertEnabled: boolean;
  status: ItemStatus;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewPantryItem = Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: ItemStatus;
};

export type ItemEventType = 'used' | 'used_partial' | 'tossed' | 'frozen';

/** Ledger of what happened to food; drives savings and waste reporting. */
export type ItemEvent = {
  id: string;
  itemId: string;
  itemName: string;
  type: ItemEventType;
  /** Fraction of the whole item this event covers (0–1). */
  fraction: number;
  valueCents: number;
  grams: number;
  at: string;
  /** Older ledger entries may lack these. */
  category?: CategoryId;
  /** Days until expiry when the event happened (negative = past date). */
  daysLeft?: number;
  /** Set when the food was used by cooking a recipe. */
  recipeId?: string;
};

export type Urgency = 'expired' | 'urgent' | 'soon' | 'fresh';
