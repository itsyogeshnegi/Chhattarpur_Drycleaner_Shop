import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { ShopSettings } from '@/models/ShopSettings';
import { getCurrentUser } from '@/lib/auth';
import { normalizeIndianPhone } from '@/lib/phone';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Allow counter staff, admin, or public pickup booking
    const createdBy = user ? user.name : 'Online Booking';

    await connectToDatabase();
    const body = await req.json();

    const {
      customer,
      items,
      discountType = 'none',
      discountValue = 0,
      paidAmount = 0,
      paymentMethod = 'cash',
      rackLocation = '',
      internalNotes = '',
      pickupDate,
      deliveryDueDate,
    } = body;

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { success: false, message: 'Customer name and phone number are required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required in the order' },
        { status: 400 }
      );
    }

    // Calculate subtotal
    let subtotal = 0;
    const validatedItems = items.map((item) => {
      const rate = Number(item.rate) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const total = rate * quantity;
      subtotal += total;

      return {
        name: String(item.name || 'Garment'),
        serviceType: item.serviceType || 'dry_clean',
        rate,
        quantity,
        total,
        notes: item.notes || '',
        inspectionImages: Array.isArray(item.inspectionImages) ? item.inspectionImages : [],
      };
    });

    // Discount Engine (Requirement 3: percentage or fixed amount)
    let discountAmount = 0;
    const discVal = Number(discountValue) || 0;

    if (discountType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, discVal))) / 100);
    } else if (discountType === 'fixed') {
      discountAmount = Math.min(subtotal, Math.max(0, discVal));
    }

    const netAfterDiscount = Math.max(0, subtotal - discountAmount);

    // Optional Tax
    const settings = await ShopSettings.findOne().lean();
    const taxRate = settings?.defaultTaxRate || 0;
    const taxAmount = Math.round((netAfterDiscount * taxRate) / 100);
    const grandTotal = netAfterDiscount + taxAmount;

    // Payment status calculation
    const paid = Math.min(grandTotal, Math.max(0, Number(paidAmount) || 0));
    const balanceAmount = grandTotal - paid;
    const paymentStatus = paid >= grandTotal ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    // Generate unique sequential invoice number
    const currentYear = new Date().getFullYear();
    const prefix = settings?.invoicePrefix || 'AHDC';
    const countToday = await OrderInvoice.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    // Format: AHDC-YYYY-XXXX (e.g. AHDC-2026-0042)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const sequenceNumber = String(countToday + 1).padStart(3, '0');
    const invoiceNumber = `${prefix}-${currentYear}-${sequenceNumber}${randomSuffix.toString().slice(-2)}`;

    const cleanPhone = normalizeIndianPhone(customer.phone);

    const newOrder = await OrderInvoice.create({
      invoiceNumber,
      customer: {
        name: customer.name.trim(),
        phone: cleanPhone || customer.phone.trim(),
        email: customer.email?.trim() || '',
        address: customer.address?.trim() || '',
      },
      items: validatedItems,
      subtotal,
      discountType,
      discountValue: discVal,
      discountAmount,
      taxRate,
      taxAmount,
      grandTotal,
      paidAmount: paid,
      balanceAmount,
      paymentStatus,
      paymentMethod,
      rackLocation,
      internalNotes,
      status: 'received',
      pickupDate: pickupDate ? new Date(pickupDate) : new Date(),
      deliveryDueDate: deliveryDueDate ? new Date(deliveryDueDate) : undefined,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      order: newOrder,
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

