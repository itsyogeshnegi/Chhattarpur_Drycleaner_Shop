import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { sendOrderReadySms } from '@/lib/sms';
import mongoose from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, triggerSms = true } = await req.json();

    const validStatuses = ['received', 'in_process', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { invoiceNumber: id }] }
      : { invoiceNumber: id };

    const updateFields: Record<string, unknown> = { status };
    if (status === 'delivered') {
      updateFields.deliveredAt = new Date();
    }

    const order = await OrderInvoice.findOneAndUpdate(query, updateFields, { new: true });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

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

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}`,
      order,
      smsResult,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

