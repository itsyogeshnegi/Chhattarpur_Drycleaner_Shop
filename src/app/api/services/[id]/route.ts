import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { ServiceItem } from '@/models/ServiceItem';
import { getCurrentUser } from '@/lib/auth';
import { CACHE_TAGS, invalidateCacheTag } from '@/lib/cache';
import mongoose from 'mongoose';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const body = await req.json();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { name: id };

    const updated = await ServiceItem.findOneAndUpdate(
      query,
      {
        $set: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.category !== undefined && { category: body.category }),
          ...(body.dryCleanRate !== undefined && { dryCleanRate: Number(body.dryCleanRate) }),
          ...(body.steamIronRate !== undefined && { steamIronRate: Number(body.steamIronRate) }),
          ...(body.unit !== undefined && { unit: body.unit.trim() }),
          ...(body.rateRangeText !== undefined && { rateRangeText: body.rateRangeText.trim() }),
          ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
          ...(body.popular !== undefined && { popular: Boolean(body.popular) }),
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Garment service item not found' }, { status: 404 });
    }

    invalidateCacheTag(CACHE_TAGS.SERVICES);
    revalidatePath('/');

    return NextResponse.json({ success: true, item: updated });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { name: id };

    await ServiceItem.findOneAndDelete(query);
    invalidateCacheTag(CACHE_TAGS.SERVICES);
    revalidatePath('/');
    return NextResponse.json({ success: true, message: 'Garment service item deleted' });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

