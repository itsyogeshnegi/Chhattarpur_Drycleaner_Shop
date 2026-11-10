import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const paramPhone = searchParams.get('phone');

    // Build identifier match
    const matchConditions: Array<Record<string, unknown>> = [];

    if (user) {
      if (user.phone) matchConditions.push({ 'customer.phone': user.phone });
      if (user.userId && /^\d+$/.test(user.userId)) matchConditions.push({ 'customer.phone': user.userId });
      if (user.email) matchConditions.push({ 'customer.email': user.email });
    }

    if (paramPhone) {
      const cleanPhone = paramPhone.replace(/\D/g, '').slice(-10);
      if (cleanPhone) {
        matchConditions.push({ 'customer.phone': cleanPhone });
        matchConditions.push({ 'customer.phone': { $regex: cleanPhone, $options: 'i' } });
      }
    }

    if (matchConditions.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const orders = await OrderInvoice.find({ $or: matchConditions })
      .select('invoiceNumber customer status items grandTotal paidAmount balanceAmount paymentStatus rackLocation createdAt pickupDate')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
