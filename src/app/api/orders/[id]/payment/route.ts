import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    if (session.role !== 'admin' && session.role !== 'counter_staff') {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      paymentMethod = 'online_razorpay',
      paidAmount,
      transactionRef,
      markFullPaid = true,
    } = body;

    const validMethods = ['cash', 'upi', 'card', 'online_razorpay'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json({ success: false, message: 'Invalid payment method' }, { status: 400 });
    }

    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { invoiceNumber: id }] }
      : { invoiceNumber: id };

    const order = await OrderInvoice.findOne(query);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const nextPaid = markFullPaid
      ? order.grandTotal
      : Math.min(order.grandTotal, Math.max(0, Number(paidAmount) || 0));
    const nextBalance = Math.max(0, order.grandTotal - nextPaid);

    order.paidAmount = nextPaid;
    order.balanceAmount = nextBalance;
    order.paymentMethod = paymentMethod;
    order.paymentStatus = nextBalance === 0 ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid';
    if (transactionRef && String(transactionRef).trim()) {
      order.razorpayPaymentId = String(transactionRef).trim();
    }

    await order.save();

    const safeOrder = order.toObject ? order.toObject() : { ...order };
    delete (safeOrder as Record<string, unknown>).deliveryOtp;

    return NextResponse.json({
      success: true,
      message:
        order.paymentStatus === 'paid'
          ? `Invoice ${order.invoiceNumber} marked as PAID (${paymentMethod}).`
          : `Payment updated for ${order.invoiceNumber}. Balance: ₹${order.balanceAmount}`,
      order: { ...safeOrder, hasDeliveryOtp: Boolean(order.deliveryOtp) },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update payment';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

