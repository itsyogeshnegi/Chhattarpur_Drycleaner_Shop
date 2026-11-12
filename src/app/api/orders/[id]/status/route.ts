import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { sendOrderReadySms } from '@/lib/sms';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function PATCH(
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

    if (!['admin', 'counter_staff', 'delivery'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only store staff can update order stages.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, otp, isOverride = false, triggerSms = true } = body;

    const validStatuses = ['received', 'in_process', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { invoiceNumber: id }] }
      : { invoiceNumber: id };

    const order = await OrderInvoice.findOne(query);

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Handle OUT FOR DELIVERY: Automatically generate 4-digit Delivery OTP if not set
    if (status === 'out_for_delivery') {
      if (!order.deliveryOtp) {
        // Generate clean, easy-to-read 4-digit code (e.g. 1000 - 9999)
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        order.deliveryOtp = generatedOtp;
        order.deliveryOtpGeneratedAt = new Date();
      }
      order.status = 'out_for_delivery';
    } else if (status === 'delivered') {
      // If order is Out for Delivery (or has a delivery OTP assigned), STRICTLY require OTP verification!
      if (order.status === 'out_for_delivery' || order.deliveryOtp) {
        // If order was out for delivery but missing deliveryOtp (legacy record), generate one immediately
        if (!order.deliveryOtp) {
          order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
          order.deliveryOtpGeneratedAt = new Date();
          await order.save();
        }

        if (isOverride) {
          order.status = 'delivered';
          order.deliveredAt = new Date();
          order.deliveryVerifiedAt = new Date();
          order.deliveryVerifiedBy = 'admin_override';
        } else {
          const cleanOtp = String(otp || '').trim();
          if (!cleanOtp) {
            return NextResponse.json(
              {
                success: false,
                requiresOtp: true,
                message: 'Delivery OTP is required to confirm this handover.',
              },
              { status: 400 }
            );
          }

          // Strict match: the entered OTP must exactly match the customer's delivery OTP
          if (cleanOtp !== String(order.deliveryOtp).trim()) {
            return NextResponse.json(
              {
                success: false,
                requiresOtp: true,
                message: 'Invalid Delivery OTP! Only the 4-digit OTP provided to the customer is accepted.',
              },
              { status: 400 }
            );
          }

          order.status = 'delivered';
          order.deliveredAt = new Date();
          order.deliveryVerifiedAt = new Date();
          order.deliveryVerifiedBy = 'customer_otp';
        }
      } else {
        // Direct counter handover (e.g. from Ready)
        order.status = 'delivered';
        order.deliveredAt = new Date();
        order.deliveryVerifiedAt = new Date();
        order.deliveryVerifiedBy = 'store_counter_handover';
      }
      // Clear OTP once handed over to keep DB storage lean
      order.deliveryOtp = undefined;
      order.deliveryOtpGeneratedAt = undefined;
    } else {
      order.status = status;
      if (status === 'cancelled') {
        order.deliveryOtp = undefined;
        order.deliveryOtpGeneratedAt = undefined;
      }
    }

    await order.save();

    // Auto trigger SMS if marked "ready" (Requirement 5)
    let smsResult = null;
    if (status === 'ready' && triggerSms) {
      smsResult = await sendOrderReadySms({
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
    }

    const safeOrder = order.toObject ? order.toObject() : { ...order };
    delete (safeOrder as Record<string, unknown>).deliveryOtp;

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}${status === 'delivered' ? ' (Delivery Confirmed)' : ''}`,
      order: { ...safeOrder, hasDeliveryOtp: Boolean(order.deliveryOtp) },
      smsResult,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

