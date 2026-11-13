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
      collectedAmount,
      transactionRef,
      markFullPaid = true,
      settle = false,
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

    // Settle flow: Customer cannot/will not pay remaining balance; waive leftover balance & close due
    if (settle) {
      if (order.balanceAmount <= 0) {
        return NextResponse.json(
          { success: false, message: 'This invoice has no outstanding balance to settle' },
          { status: 400 }
        );
      }
      const rawCollected =
        collectedAmount !== undefined && collectedAmount !== null ? Number(collectedAmount) : 0;
      const parsedCollected = Math.max(0, Math.round(rawCollected * 100) / 100);

      if (parsedCollected > order.balanceAmount) {
        return NextResponse.json(
          {
            success: false,
            message: `Collected amount cannot exceed due balance of ₹${order.balanceAmount}`,
          },
          { status: 400 }
        );
      }

      const prevPaid = Number(order.paidAmount) || 0;
      const nextPaid = Math.round((prevPaid + parsedCollected) * 100) / 100;
      const waivedAmount = Math.max(0, Math.round((order.balanceAmount - parsedCollected) * 100) / 100);

      order.paidAmount = nextPaid;
      order.balanceAmount = 0;
      order.paymentStatus = 'paid';
      order.paymentMethod = paymentMethod;

      if (waivedAmount > 0) {
        order.discountAmount = Math.round(((Number(order.discountAmount) || 0) + waivedAmount) * 100) / 100;
        order.grandTotal = Math.max(0, Math.round((order.grandTotal - waivedAmount) * 100) / 100);
        order.discountType = 'fixed';
        const note = `[Settled on ${new Date().toLocaleDateString('en-IN')}: ₹${parsedCollected} collected via ${paymentMethod}, ₹${waivedAmount} balance waived/settled]`;
        order.internalNotes = order.internalNotes ? `${order.internalNotes}\n${note}` : note;
      }

      if (transactionRef && String(transactionRef).trim()) {
        order.razorpayPaymentId = String(transactionRef).trim();
      }

      await order.save();

      const safeOrder = order.toObject ? order.toObject() : { ...order };
      delete (safeOrder as Record<string, unknown>).deliveryOtp;

      return NextResponse.json({
        success: true,
        message:
          waivedAmount > 0
            ? `Invoice ${order.invoiceNumber} SETTLED (₹${parsedCollected} collected, ₹${waivedAmount} balance waived).`
            : `Invoice ${order.invoiceNumber} fully settled in full.`,
        order: { ...safeOrder, hasDeliveryOtp: Boolean(order.deliveryOtp) },
      });
    }

    let nextPaid = order.grandTotal;
    if (collectedAmount !== undefined && collectedAmount !== null && !markFullPaid) {
      const parsedCollected = Math.round(Number(collectedAmount) * 100) / 100;
      if (!Number.isFinite(parsedCollected) || parsedCollected <= 0) {
        return NextResponse.json(
          { success: false, message: 'Collected amount must be greater than ₹0' },
          { status: 400 }
        );
      }
      if (order.balanceAmount <= 0) {
        return NextResponse.json(
          { success: false, message: 'This invoice is already fully paid' },
          { status: 400 }
        );
      }
      if (parsedCollected > order.balanceAmount) {
        return NextResponse.json(
          {
            success: false,
            message: `Collected amount cannot exceed due balance of ₹${order.balanceAmount}`,
          },
          { status: 400 }
        );
      }
      nextPaid = Math.min(
        order.grandTotal,
        Math.round(((Number(order.paidAmount) || 0) + parsedCollected) * 100) / 100
      );
    } else if (!markFullPaid) {
      nextPaid = Math.min(order.grandTotal, Math.max(0, Number(paidAmount) || 0));
    }

    const nextBalance = Math.max(0, Math.round((order.grandTotal - nextPaid) * 100) / 100);

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

