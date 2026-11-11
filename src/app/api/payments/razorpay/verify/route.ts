import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import {
  applyRazorpaySettlement,
  getRazorpayClient,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from '@/lib/razorpay';
import { calculatePaymentOptions } from '@/lib/paymentPlan';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!invoiceId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { success: false, message: 'Missing Razorpay payment verification fields' },
        { status: 400 }
      );
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Razorpay API keys are not configured for automated checkout verification.',
        },
        { status: 400 }
      );
    }

    const isValid = verifyRazorpaySignature(
      String(razorpayOrderId),
      String(razorpayPaymentId),
      String(razorpaySignature)
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(invoiceId)
      ? { $or: [{ _id: invoiceId }, { invoiceNumber: invoiceId }] }
      : { invoiceNumber: invoiceId };

    const invoice = await OrderInvoice.findOne(query);
    if (!invoice) {
      return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.razorpayOrderId && invoice.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        { success: false, message: 'Razorpay Order ID does not match this invoice.' },
        { status: 400 }
      );
    }

    if (invoice.razorpayPaymentId === razorpayPaymentId) {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified for this invoice.',
        invoice,
      });
    }

    const rzpOrder = await getRazorpayClient().orders.fetch(String(razorpayOrderId));
    const orderAmountPaise = Number(rzpOrder?.amount) || 0;
    const paidNowInr = Math.round(orderAmountPaise / 100);
    const opts = calculatePaymentOptions(invoice.grandTotal, invoice.paidAmount);

    // Enforce minimum 50% advance when nothing has been paid yet, or full remaining balance
    const minRequired = opts.canChooseHalf ? opts.minHalfAmount : opts.remaining;
    if (paidNowInr < minRequired) {
      return NextResponse.json(
        {
          success: false,
          message: `Paid amount (₹${paidNowInr}) is below minimum mandatory requirement (₹${minRequired}).`,
        },
        { status: 400 }
      );
    }

    applyRazorpaySettlement(invoice, {
      amountInPaise: orderAmountPaise,
      razorpayOrderId: String(razorpayOrderId),
      razorpayPaymentId: String(razorpayPaymentId),
    });
    await invoice.save();

    return NextResponse.json({
      success: true,
      message:
        invoice.balanceAmount === 0
          ? 'Full payment verified and invoice marked as PAID'
          : `50% advance payment (₹${paidNowInr}) verified! Remaining balance: ₹${invoice.balanceAmount}`,
      invoice,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
