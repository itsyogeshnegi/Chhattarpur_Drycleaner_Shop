import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`order-detail:${ip}`, 45, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(
        'Too many invoice lookup requests. Please wait a minute and try again.',
        limit.retryAfterSeconds
      );
    }

    const { id } = await params;
    const trimmedId = id.trim();
    await connectToDatabase();

    const invoiceCandidates = Array.from(new Set([trimmedId, trimmedId.toUpperCase()]));
    let query: Record<string, unknown>;
    if (mongoose.Types.ObjectId.isValid(trimmedId)) {
      query = { $or: [{ _id: trimmedId }, { invoiceNumber: { $in: invoiceCandidates } }] };
    } else {
      query = { invoiceNumber: { $in: invoiceCandidates } };
    }

    const order = await OrderInvoice.findOne(query).lean();

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order / Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

