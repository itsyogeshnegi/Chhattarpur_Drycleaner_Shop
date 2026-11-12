import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { ShopSettings } from '@/models/ShopSettings';
import { getCurrentUser } from '@/lib/auth';
import { isRazorpayConfigured } from '@/lib/razorpay';
import {
  CACHE_TAGS,
  PUBLIC_CACHE_HEADERS,
  getCachedShopSettings,
  invalidateCacheTag,
} from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const fresh = new URL(req.url).searchParams.get('fresh') === '1';

    let settings: Record<string, unknown> | null = fresh
      ? await (async () => {
          await connectToDatabase();
          return ShopSettings.findOne()
            .select('-smsReadyTemplate -whatsappInvoiceTemplate -__v')
            .lean();
        })()
      : await getCachedShopSettings();

    if (!settings) {
      await connectToDatabase();
      const created = await ShopSettings.create({});
      settings = JSON.parse(JSON.stringify(created));
      invalidateCacheTag(CACHE_TAGS.SETTINGS);
    }

    return NextResponse.json(
      {
        success: true,
        settings,
        checkoutEnabled: isRazorpayConfigured(),
      },
      {
        headers: fresh ? { 'Cache-Control': 'no-store' } : PUBLIC_CACHE_HEADERS,
      }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await req.json();

    const updateFields: Record<string, unknown> = {};
    if (typeof body.storeName === 'string') updateFields.storeName = body.storeName.trim();
    if (typeof body.tagline === 'string') updateFields.tagline = body.tagline.trim();
    if (typeof body.address === 'string') updateFields.address = body.address.trim();
    if (typeof body.phone1 === 'string') updateFields.phone1 = body.phone1.trim();
    if (typeof body.phone2 === 'string') updateFields.phone2 = body.phone2.trim();
    if (typeof body.whatsappNumber === 'string') updateFields.whatsappNumber = body.whatsappNumber.trim();
    if (typeof body.razorpayMeUrl === 'string') updateFields.razorpayMeUrl = body.razorpayMeUrl.trim();
    if (typeof body.email === 'string') updateFields.email = body.email.trim();
    if (typeof body.invoicePrefix === 'string') updateFields.invoicePrefix = body.invoicePrefix.trim();
    if (body.defaultTaxRate !== undefined) {
      const rate = Number(body.defaultTaxRate);
      if (Number.isFinite(rate) && rate >= 0 && rate <= 50) {
        updateFields.defaultTaxRate = rate;
      }
    }
    if (body.maxDiscountPercentage !== undefined) {
      const disc = Number(body.maxDiscountPercentage);
      if (Number.isFinite(disc) && disc >= 0 && disc <= 100) {
        updateFields.maxDiscountPercentage = disc;
      }
    }
    if (Array.isArray(body.termsAndConditions)) {
      updateFields.termsAndConditions = body.termsAndConditions
        .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.trim());
    }
    if (typeof body.openingHours === 'string') updateFields.openingHours = body.openingHours.trim();

    const updatedSettings = await ShopSettings.findOneAndUpdate(
      {},
      { $set: updateFields },
      {
        new: true,
        upsert: true,
      }
    ).select('-smsReadyTemplate -whatsappInvoiceTemplate -__v');

    invalidateCacheTag(CACHE_TAGS.SETTINGS);
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
