import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { getRazorpayClient } from '@/lib/razorpay';
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

    const invoice = await OrderInvoice.findOne(query);
    if (!invoice) {
      return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.paymentStatus === 'paid') {
      return NextResponse.json({ success: false, message: 'Invoice is already fully paid' }, { status: 400 });
    }

    const payableAmount = invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal;

    // Razorpay amount in paise (multiply INR by 100)
    const amountInPaise = Math.round(payableAmount * 100);

    const razorpayKey = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';

    // If using live/test Razorpay API keys
    if (razorpayKey && razorpayKey !== 'rzp_test_placeholder') {
      const razorpay = getRazorpayClient();
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: invoice.invoiceNumber,
        notes: {
          customerName: invoice.customer.name,
          customerPhone: invoice.customer.phone,
          invoiceNumber: invoice.invoiceNumber,
        },
      };

      const razorpayOrder = await razorpay.orders.create(options);
      invoice.razorpayOrderId = razorpayOrder.id;
      await invoice.save();

      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: razorpayKey,
        customer: invoice.customer,
      });
    }

    // Demo/Simulated payment order for testing without active Razorpay account
    const simulatedOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    invoice.razorpayOrderId = simulatedOrderId;
    await invoice.save();

    return NextResponse.json({
      success: true,
      simulated: true,
      orderId: simulatedOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key: 'rzp_test_placeholder',
      customer: invoice.customer,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

