import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ShopSettings } from '@/models/ShopSettings';
import { getCurrentUser } from '@/lib/auth';
import { isRazorpayConfigured } from '@/lib/razorpay';

export async function GET() {
  try {
    await connectToDatabase();
    let settings: Record<string, unknown> | null = await ShopSettings.findOne().lean();

    if (!settings) {
      const created = await ShopSettings.create({});
      settings = JSON.parse(JSON.stringify(created));
    }

    return NextResponse.json({
      success: true,
      settings,
      checkoutEnabled: isRazorpayConfigured(),
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();

    const updatedSettings = await ShopSettings.findOneAndUpdate({}, body, {
      new: true,
      upsert: true,
    });

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
