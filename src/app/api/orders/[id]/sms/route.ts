import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { sendOrderReadySms } from '@/lib/sms';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!['admin', 'counter_staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only store staff can trigger SMS alerts.' },
        { status: 403 }
      );
    }

    const ip = getClientIp(req);
    const limit = checkRateLimit(`sms-dispatch:${ip}`, 15, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(
        'Too many SMS requests. Please wait a minute before sending more alerts.',
        limit.retryAfterSeconds
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { invoiceNumber: id }] }
      : { invoiceNumber: id };

    const order = await OrderInvoice.findOne(query);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const smsResult = await sendOrderReadySms({
      customerPhone: order.customer.phone,
      customerName: order.customer.name,
      invoiceNumber: order.invoiceNumber,
      grandTotal: order.grandTotal,
    });

    if (smsResult.success) {
      order.smsNotificationSent = true;
      order.smsSentAt = new Date();
      await order.save();
    }

    return NextResponse.json({
      success: smsResult.success,
      message: smsResult.message,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

