import { unstable_cache, revalidateTag } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { ShopSettings } from '@/models/ShopSettings';
import { ServiceItem } from '@/models/ServiceItem';
import { Review } from '@/models/Review';

export const CACHE_TAGS = {
  SETTINGS: 'shop-settings',
  SERVICES: 'services-catalog',
  REVIEWS: 'approved-reviews',
} as const;

export const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
} as const;

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function invalidateCacheTag(tag: string): void {
  try {
    revalidateTag(tag);
  } catch (err) {
    console.warn(`[cache] revalidateTag(${tag}) skipped:`, err);
  }
}

export interface CachedServiceItem {
  _id: string;
  name: string;
  category: 'mens' | 'womens' | 'home' | 'laundry';
  dryCleanRate: number;
  steamIronRate?: number;
  rateRangeText?: string;
  unit: string;
  popular?: boolean;
}

export interface CachedReviewItem {
  _id: string;
  name: string;
  role: string;
  serviceType: string;
  rating: number;
  comment: string;
  isVerifiedCustomer: boolean;
  isApproved: boolean;
  editedByAdmin?: boolean;
  createdAt?: string;
}

export interface CachedReviewsPayload {
  reviews: CachedReviewItem[];
  totalReviews: number;
  averageRating: number;
}

const fetchShopSettingsCached = unstable_cache(
  async () => {
    await connectToDatabase();
    const settings = await ShopSettings.findOne()
      .select('-smsReadyTemplate -whatsappInvoiceTemplate -__v')
      .lean();
    return settings ? JSON.parse(JSON.stringify(settings)) : null;
  },
  ['cached-shop-settings-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.SETTINGS] }
);

export async function getCachedShopSettings(): Promise<Record<string, unknown> | null> {
  try {
    return await fetchShopSettingsCached();
  } catch (err) {
    console.error('[cache] getCachedShopSettings failed:', err);
    throw err;
  }
}

const fetchActiveServicesCached = unstable_cache(
  async (): Promise<CachedServiceItem[]> => {
    await connectToDatabase();
    const items = await ServiceItem.find({ isActive: true })
      .select('name category dryCleanRate steamIronRate rateRangeText unit popular')
      .sort({ category: 1, popular: -1, name: 1 })
      .lean();
    return JSON.parse(JSON.stringify(items));
  },
  ['cached-active-services-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.SERVICES] }
);

export async function getCachedActiveServices(): Promise<CachedServiceItem[]> {
  try {
    return await fetchActiveServicesCached();
  } catch (err) {
    console.error('[cache] getCachedActiveServices failed:', err);
    throw err;
  }
}

const fetchApprovedReviewsCached = unstable_cache(
  async (): Promise<CachedReviewsPayload> => {
    await connectToDatabase();
    const approvedReviews = await Review.find({ isApproved: true })
      .select('-customerPhone -userId -__v')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const serialized: CachedReviewItem[] = JSON.parse(JSON.stringify(approvedReviews));
    const totalReviews = serialized.length;
    const averageRating =
      totalReviews > 0
        ? Number(
            (
              serialized.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) /
              totalReviews
            ).toFixed(1)
          )
        : 5.0;

    return {
      reviews: serialized,
      totalReviews,
      averageRating,
    };
  },
  ['cached-approved-reviews-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.REVIEWS] }
);

export async function getCachedApprovedReviews(): Promise<CachedReviewsPayload> {
  try {
    return await fetchApprovedReviewsCached();
  } catch (err) {
    console.error('[cache] getCachedApprovedReviews failed:', err);
    throw err;
  }
}

