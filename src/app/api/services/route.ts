import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { ServiceItem } from '@/models/ServiceItem';
import { getCurrentUser } from '@/lib/auth';
import {
  CACHE_TAGS,
  PUBLIC_CACHE_HEADERS,
  escapeRegExp,
  getCachedActiveServices,
  invalidateCacheTag,
} from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim();
    const includeAll = searchParams.get('all') === 'true';

    // Default unfiltered public catalog read uses shared cache + CDN headers
    if (!includeAll && (!category || category === 'all') && !search) {
      const items = await getCachedActiveServices();
      return NextResponse.json(
        { success: true, count: items.length, items },
        { headers: PUBLIC_CACHE_HEADERS }
      );
    }

    await connectToDatabase();

    const query: Record<string, unknown> = includeAll ? {} : { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: escapeRegExp(search), $options: 'i' };
    }

    // Fast lean projection
    const items = await ServiceItem.find(query)
      .select('name category dryCleanRate steamIronRate rateRangeText unit popular isActive')
      .sort({ category: 1, popular: -1, name: 1 })
      .lean();

    return NextResponse.json(
      { success: true, count: items.length, items },
      {
        headers: includeAll
          ? { 'Cache-Control': 'no-store' }
          : PUBLIC_CACHE_HEADERS,
      }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();

    const newItem = await ServiceItem.create({
      name: typeof body.name === 'string' ? body.name.trim() : '',
      category: body.category,
      dryCleanRate: Number(body.dryCleanRate) || 0,
      ...(body.steamIronRate !== undefined && { steamIronRate: Number(body.steamIronRate) || 0 }),
      ...(typeof body.rateRangeText === 'string' && body.rateRangeText.trim()
        ? { rateRangeText: body.rateRangeText.trim() }
        : {}),
      ...(typeof body.unit === 'string' && body.unit.trim()
        ? { unit: body.unit.trim() }
        : {}),
      ...(body.popular !== undefined && { popular: Boolean(body.popular) }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    });

    invalidateCacheTag(CACHE_TAGS.SERVICES);
    revalidatePath('/');

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
