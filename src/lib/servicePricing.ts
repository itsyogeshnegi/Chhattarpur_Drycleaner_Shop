export interface RateLikeItem {
  name: string;
  category?: string;
  dryCleanRate?: number;
  steamIronRate?: number;
  rateRangeText?: string;
  isPriceRange?: boolean;
}

/**
 * Checks whether an item is a specialty range-price / inspection-dependent item
 * (e.g. Women's Suit 3Pcs, Women's Suit 2Pcs, Saree, Lehenga, Gown, Men's Sherwani).
 * For these items, customers are shown "Owner will connect with you" instead of
 * a fixed current amount or 50% advance.
 */
export function isRangePriceItem(item?: Partial<RateLikeItem> | null): boolean {
  if (!item) return false;
  if (item.isPriceRange === true) return true;

  const name = (item.name || '').toLowerCase().trim();
  const category = (item.category || '').toLowerCase().trim();

  // 1. Men's Sherwani
  if (name.includes('sherwani')) return true;

  // 2. Saree (all variants: Saree, Saree start from, etc.)
  if (name.includes('saree')) return true;

  // 3. Lehenga / Lengha (all variants: Lehenga, Lengha start, etc.)
  if (name.includes('lehenga') || name.includes('lengha')) return true;

  // 4. Gown (all variants: Gown, Gown start, etc.)
  if (name.includes('gown')) return true;

  // 5. Women's Suit (3 Pcs) and Suit (2 Pcs)
  if (category === 'womens' && name.includes('suit')) return true;

  return false;
}

/**
 * Checks if a list of invoice/order items contains any range price items
 */
export function hasRangePriceItems(items?: Array<{ name?: string; notes?: string; rate?: number }> | null): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some((it) => {
    if (!it) return false;
    if (isRangePriceItem({ name: it.name })) return true;
    const notesLower = (it.notes || '').toLowerCase();
    if (notesLower.includes('owner will connect') || notesLower.includes('price on inspection')) return true;
    return false;
  });
}

export const OWNER_CONNECT_LABEL = 'Owner will connect with you';
export const OWNER_CONNECT_BADGE = 'Owner will connect with you';
export const OWNER_CONNECT_NOTE = 'Price on Inspection • Owner will connect with you';

