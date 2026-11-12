import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { getCurrentUser } from '@/lib/auth';
import { escapeRegExp } from '@/lib/cache';

export async function GET(req: NextRequest) {
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
        { success: false, message: 'Forbidden: Only store staff can list all orders.' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const query: Record<string, unknown> = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const escapedSearch = escapeRegExp(search);
      const cleanDigits = search.replace(/\D/g, '').replace(/^0+/, '');
      const orConditions: Array<Record<string, unknown>> = [
        { invoiceNumber: { $regex: `^${escapeRegExp(search.toUpperCase())}` } },
        { 'customer.name': { $regex: `^${escapedSearch}`, $options: 'i' } },
      ];
      if (cleanDigits.length >= 4) {
        const tailDigits = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
        orConditions.push({ 'customer.phone': { $regex: `^${escapeRegExp(tailDigits)}` } });
      }
      query.$or = orConditions;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      OrderInvoice.find(query)
        .select('-deliveryOtp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrderInvoice.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        orders,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

