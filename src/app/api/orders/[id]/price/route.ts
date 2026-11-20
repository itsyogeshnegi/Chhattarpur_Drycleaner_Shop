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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!['admin', 'counter_staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only store admin or staff can update order pricing.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const trimmedId = id.trim();
    const body = await req.json();
    const { items: updatedItems, discountType, discountValue } = body;

    if (!Array.isArray(updatedItems) || updatedItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Updated items array is required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const invoiceCandidates = Array.from(new Set([trimmedId, trimmedId.toUpperCase()]));
    const query = mongoose.Types.ObjectId.isValid(trimmedId)
      ? { $or: [{ _id: trimmedId }, { invoiceNumber: { $in: invoiceCandidates } }] }
      : { invoiceNumber: { $in: invoiceCandidates } };

    const order = await OrderInvoice.findOne(query);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order / Invoice not found.' },
        { status: 404 }
      );
    }

    // Update item rates & totals
    const mergedItems = order.items.map((existingItem, idx) => {
      const incoming = updatedItems[idx] || updatedItems.find((u) => u.name === existingItem.name);
      if (!incoming) return existingItem;

      const newRate = Math.max(0, Math.round(Number(incoming.rate) || 0));
      const quantity = existingItem.quantity || 1;
      const total = newRate * quantity;

      let newNotes = existingItem.notes || '';
      if (newRate > 0) {
        // Clear or update owner connect / inspection note
        if (newNotes.toLowerCase().includes('inspection') || newNotes.toLowerCase().includes('owner will connect')) {
          newNotes = `Quote confirmed: ₹${newRate}/pc`;
        }
      }
      if (typeof incoming.notes === 'string') {
        newNotes = incoming.notes.trim();
      }

      return {
        name: existingItem.name,
        serviceType: existingItem.serviceType,
        inspectionImages: existingItem.inspectionImages,
        rate: newRate,
        quantity,
        total,
        notes: newNotes,
      };
    });

    // Recalculate Subtotal
    const subtotal = mergedItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);

    // Discounts
    const finalDiscType = discountType || order.discountType || 'none';
    const finalDiscVal = discountValue !== undefined ? Number(discountValue) || 0 : order.discountValue || 0;
    let discountAmount = 0;

    if (finalDiscType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, finalDiscVal))) / 100);
    } else if (finalDiscType === 'fixed') {
      discountAmount = Math.min(subtotal, Math.max(0, finalDiscVal));
    }

    const netAfterDiscount = Math.max(0, subtotal - discountAmount);
    const taxRate = Number(order.taxRate) || 0;
    const taxAmount = Math.round((netAfterDiscount * taxRate) / 100);
    const grandTotal = netAfterDiscount + taxAmount;

    // Balance and payment status calculation
    const paidAmount = Number(order.paidAmount) || 0;
    const balanceAmount = Math.max(0, grandTotal - paidAmount);

    // Payment status: if grandTotal is 0 or any range item is still rate 0, it is unpaid/pending
    const hasPendingRates = mergedItems.some((it) => it.rate === 0);
    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';

    if (grandTotal > 0 && !hasPendingRates && paidAmount >= grandTotal) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'unpaid';
    }

    // Apply updates
    order.items = mergedItems as typeof order.items;
    order.subtotal = subtotal;
    order.discountType = finalDiscType;
    order.discountValue = finalDiscVal;
    order.discountAmount = discountAmount;
    order.taxAmount = taxAmount;
    order.grandTotal = grandTotal;
    order.balanceAmount = balanceAmount;
    order.paymentStatus = paymentStatus;

    await order.save();

    // Generate WhatsApp link for owner to share with customer
    const host = req.headers.get('host') || 'alharamdrycleaner.shop';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const invoiceUrl = `${protocol}://${host}/invoice/${order.invoiceNumber}`;
    const cleanPhone = (order.customer.phone || '').replace(/\D/g, '').replace(/^0+/, '');
    const recipientPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone.slice(-10)}`;
    const minAdvance = Math.ceil(grandTotal * 0.5);

    const whatsappMessage = `Hello ${order.customer.name}, your garment cleaning quote for Invoice #${order.invoiceNumber} has been updated.\n\n*Total Amount:* ₹${grandTotal}/-\n*50% Advance (Mandatory):* ₹${minAdvance}/-\n\n💳 *View Bill & Pay Online (Razorpay / UPI):*\n${invoiceUrl}\n\nThank you,\nAL-HARAM Drycleaner's`;
    const whatsappUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json({
      success: true,
      message: `Quote for Invoice #${order.invoiceNumber} updated to ₹${grandTotal}/- successfully!`,
      order,
      whatsappUrl,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
