import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { getCurrentUser } from '@/lib/auth';
import { normalizeIndianPhone } from '@/lib/phone';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const ip = getClientIp(req);
      const limit = checkRateLimit(`customer-orders:${ip}`, 30, 60_000);
      if (!limit.allowed) {
        return rateLimitResponse(
          'Too many lookup requests. Please wait a minute and try again.',
          limit.retryAfterSeconds
        );
      }
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const paramPhone = searchParams.get('phone');

    // Build indexed equality match conditions (never unanchored $regex COLLSCAN)
    const matchConditions: Array<Record<string, unknown>> = [];

    if (user) {
      const userPhone = user.phone ? normalizeIndianPhone(user.phone) : '';
      if (userPhone) {
        matchConditions.push({
          'customer.phone': { $in: [userPhone, `0${userPhone}`, `+91${userPhone}`, `91${userPhone}`] },
        });
      }
      if (user.userId && /^\d+$/.test(user.userId)) {
        const uidPhone = normalizeIndianPhone(user.userId);
        if (uidPhone) matchConditions.push({ 'customer.phone': uidPhone });
      }
      if (user.email) matchConditions.push({ 'customer.email': user.email.toLowerCase() });
    }

    if (paramPhone) {
      const cleanPhone = normalizeIndianPhone(paramPhone);
      if (cleanPhone.length === 10) {
        matchConditions.push({
          'customer.phone': { $in: [cleanPhone, `0${cleanPhone}`, `+91${cleanPhone}`, `91${cleanPhone}`] },
        });
      } else {
        const digitsOnly = paramPhone.replace(/\D/g, '');
        if (digitsOnly.length >= 10) {
          const tail = digitsOnly.slice(-10);
          matchConditions.push({ 'customer.phone': tail });
        }
      }
    }

    if (matchConditions.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const orders = await OrderInvoice.find({ $or: matchConditions })
      .select('invoiceNumber customer status items grandTotal paidAmount balanceAmount paymentStatus rackLocation createdAt pickupDate deliveryDueDate deliveryOtp deliveryVerifiedBy deliveredAt deliveryVerifiedAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

