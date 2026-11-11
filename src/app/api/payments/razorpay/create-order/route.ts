import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { ShopSettings } from '@/models/ShopSettings';
import {
  buildRazorpayMePayUrl,
  getRazorpayClient,
  isRazorpayConfigured,
} from '@/lib/razorpay';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ success: false, message: 'Invoice ID required' }, { status: 400 });
    }

    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(invoiceId)
      ? { $or: [{ _id: invoiceId }, { invoiceNumber: invoiceId }] }
      : { invoiceNumber: invoiceId };

    const [invoice, settings] = await Promise.all([
      OrderInvoice.findOne(query),
      ShopSettings.findOne().select('razorpayMeUrl').lean(),
    ]);

    if (!invoice) {
      return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.paymentStatus === 'paid') {
      return NextResponse.json(
        { success: false, message: 'Invoice is already fully paid' },
        { status: 400 }
      );
    }

    const payableAmount = invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal;
    if (payableAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'No balance amount due on this invoice' },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(payableAmount * 100);
    const razorpayMePayUrl = buildRazorpayMePayUrl(settings?.razorpayMeUrl);

    // Mode 1: Real Razorpay Standard Checkout when API keys are configured
    if (isRazorpayConfigured()) {
      const razorpay = getRazorpayClient();
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: invoice.invoiceNumber,
        notes: {
          customerName: invoice.customer.name,
          customerPhone: invoice.customer.phone,
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      invoice.razorpayOrderId = razorpayOrder.id;
      await invoice.save();

      return NextResponse.json({
        success: true,
        mode: 'checkout',
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        payableAmount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        customer: invoice.customer,
        razorpayMeUrl: razorpayMePayUrl,
      });
    }

    // Mode 2: Direct Razorpay.me payment handle fallback until API keys are added
    return NextResponse.json({
      success: true,
      mode: 'payment_link',
      payableAmount,
      amount: amountInPaise,
      currency: 'INR',
      razorpayMeUrl: razorpayMePayUrl,
      customer: invoice.customer,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
