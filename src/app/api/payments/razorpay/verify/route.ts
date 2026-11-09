import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!invoiceId || !razorpayOrderId) {
      return NextResponse.json({ success: false, message: 'Missing payment details' }, { status: 400 });
    }

    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId || 'demo_pay_id', razorpaySignature || 'demo_sig');

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
    }

    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(invoiceId)
      ? { $or: [{ _id: invoiceId }, { invoiceNumber: invoiceId }] }
      : { invoiceNumber: invoiceId };

    const invoice = await OrderInvoice.findOne(query);
    if (!invoice) {
      return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
    }

    invoice.paymentStatus = 'paid';
    invoice.paidAmount = invoice.grandTotal;
    invoice.balanceAmount = 0;
    invoice.paymentMethod = 'online_razorpay';
    invoice.razorpayPaymentId = razorpayPaymentId || `pay_sim_${Date.now()}`;
    await invoice.save();

    return NextResponse.json({
      success: true,
      message: 'Payment verified and invoice marked as PAID',
      invoice,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

