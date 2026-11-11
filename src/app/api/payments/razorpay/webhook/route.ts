import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import {
  applyRazorpaySettlement,
  verifyRazorpayWebhookSignature,
} from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ success: false, message: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event;

    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      return NextResponse.json({ success: true, ignored: true });
    }

    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id;
    const invoiceNumber =
      paymentEntity?.notes?.invoiceNumber || orderEntity?.notes?.invoiceNumber || orderEntity?.receipt;

    if (!razorpayOrderId && !invoiceNumber) {
      return NextResponse.json({ success: true, ignored: true });
    }

    await connectToDatabase();

    const orFilters: Array<Record<string, unknown>> = [];
    if (razorpayOrderId) orFilters.push({ razorpayOrderId });
    if (invoiceNumber) orFilters.push({ invoiceNumber });

    const invoice = await OrderInvoice.findOne({ $or: orFilters });
    if (!invoice) {
      return NextResponse.json({ success: false, message: 'Matching invoice not found' }, { status: 404 });
    }

    const amountInPaise = Number(paymentEntity?.amount ?? orderEntity?.amount) || 0;
    const settled = applyRazorpaySettlement(invoice, {
      amountInPaise:
        amountInPaise > 0 ? amountInPaise : Math.round((invoice.balanceAmount || invoice.grandTotal) * 100),
      razorpayOrderId: razorpayOrderId ? String(razorpayOrderId) : undefined,
      razorpayPaymentId: razorpayPaymentId ? String(razorpayPaymentId) : undefined,
    });

    if (!settled.duplicate && invoice.isModified()) {
      await invoice.save();
    }

    return NextResponse.json({ success: true, invoiceNumber: invoice.invoiceNumber });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

