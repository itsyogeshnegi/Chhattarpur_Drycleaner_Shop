import { NextRequest, NextResponse } from 'next/server';
import type { PipelineStage } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { normalizeIndianPhone } from '@/lib/phone';
import { escapeRegExp } from '@/lib/cache';

function buildPhoneVariants(cleanPhone: string): string[] {
  if (!cleanPhone) return [];
  return Array.from(
    new Set([cleanPhone, `0${cleanPhone}`, `+91${cleanPhone}`, `91${cleanPhone}`])
  );
}

function buildCustomerActions(displayName: string, cleanPhone: string, address?: string) {
  return {
    whatsappUrl: `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
      `Hello ${displayName}! Greetings from Al-Haram Dry Cleaners & Laundry Chattarpur. How may we assist you today?`
    )}`,
    posNewOrderUrl: `/admin/counter?customerName=${encodeURIComponent(
      displayName
    )}&customerPhone=${encodeURIComponent(cleanPhone)}&customerAddress=${encodeURIComponent(
      address || ''
    )}`,
  };
}

export async function GET(req: NextRequest) {
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
        { success: false, message: 'Forbidden: Only store staff can view customer directory.' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const detailPhone = searchParams.get('phone')?.trim() || '';

    // Date range filter for checking revenue & activity in a specific window
    const startDateParam = searchParams.get('startDate')?.trim() || '';
    const endDateParam = searchParams.get('endDate')?.trim() || '';

    let dateRangeFilter: { $gte: Date; $lte: Date } | null = null;
    if (startDateParam || endDateParam) {
      if (!startDateParam || !endDateParam) {
        return NextResponse.json(
          {
            success: false,
            message: 'Both Start Date and End Date are mandatory when applying a date filter.',
          },
          { status: 400 }
        );
      }

      if (endDateParam < startDateParam) {
        return NextResponse.json(
          {
            success: false,
            message: 'End Date cannot be smaller than Start Date.',
          },
          { status: 400 }
        );
      }

      const start = new Date(`${startDateParam}T00:00:00+05:30`);
      const end = new Date(`${endDateParam}T23:59:59.999+05:30`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid date format. Please provide valid dates (YYYY-MM-DD).',
          },
          { status: 400 }
        );
      }

      if (end < start) {
        return NextResponse.json(
          {
            success: false,
            message: 'End Date cannot be smaller than Start Date.',
          },
          { status: 400 }
        );
      }

      dateRangeFilter = { $gte: start, $lte: end };
    }

    // Lazy detail lookup for "Invoices (N)" modal: indexed single-customer history query
    if (detailPhone) {
      const cleanPhone = normalizeIndianPhone(detailPhone) || detailPhone;
      const variants = buildPhoneVariants(cleanPhone);
      const phoneQuery = variants.length > 0 ? { $in: variants } : cleanPhone;

      const orderQuery: Record<string, unknown> = {
        'customer.phone': phoneQuery,
        ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
      };

      const [orders, regUser] = await Promise.all([
        OrderInvoice.find(orderQuery)
          .select('invoiceNumber status grandTotal paidAmount balanceAmount paymentStatus createdAt items customer')
          .sort({ createdAt: -1 })
          .lean(),
        User.findOne({
          role: 'customer',
          phone: phoneQuery,
        })
          .select('name phone email')
          .lean(),
      ]);

      const orderSummaries = orders.map((ord) => ({
        invoiceNumber: ord.invoiceNumber,
        status: ord.status,
        grandTotal: ord.grandTotal || 0,
        balanceAmount: ord.balanceAmount || 0,
        paymentStatus: ord.paymentStatus || 'unpaid',
        createdAt: ord.createdAt,
        itemsSummary: Array.isArray(ord.items)
          ? ord.items.map((it) => `${it.quantity || 1}x ${it.name}`).join(', ')
          : '',
      }));

      const latest = orders[0];
      const displayName = latest?.customer?.name || regUser?.name || 'Valued Customer';
      const address =
        orders.find((o) => o.customer?.address)?.customer?.address || 'Chattarpur / Delhi NCR';
      const email =
        orders.find((o) => o.customer?.email)?.customer?.email || regUser?.email || '';

      return NextResponse.json(
        {
          success: true,
          customer: {
            id: cleanPhone,
            name: displayName,
            phone: cleanPhone,
            email,
            address,
            isRegistered: Boolean(regUser),
            totalOrders: orderSummaries.length,
            totalSpent: orders.reduce((s, o) => s + (o.grandTotal || 0), 0),
            totalPaid: orders.reduce((s, o) => s + (o.paidAmount || 0), 0),
            totalBalance: orders.reduce((s, o) => s + (o.balanceAmount || 0), 0),
            firstOrderDate: orders[orders.length - 1]?.createdAt,
            lastOrderDate: latest?.createdAt,
            orders: orderSummaries,
            lastThreeOrders: orderSummaries.slice(0, 3),
            actions: buildCustomerActions(displayName, cleanPhone, address),
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const matchStage: Record<string, unknown> = {
      'customer.phone': { $exists: true, $ne: '' },
      ...(dateRangeFilter ? { createdAt: dateRangeFilter } : {}),
    };

    if (search) {
      const escaped = escapeRegExp(search);
      const cleanDigits = search.replace(/\D/g, '').replace(/^0+/, '');
      const orFilters: Array<Record<string, unknown>> = [
        { 'customer.name': { $regex: escaped, $options: 'i' } },
        { 'customer.address': { $regex: escaped, $options: 'i' } },
      ];
      if (cleanDigits.length >= 3) {
        const tailDigits = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
        orFilters.push({ 'customer.phone': { $regex: escapeRegExp(tailDigits) } });
      }
      matchStage.$or = orFilters;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          // Normalize trailing 10 chars in-DB so "08745073655", "+918745073655", "8745073655" merge atomically
          _id: {
            $substrCP: [
              { $ifNull: ['$customer.phone', ''] },
              {
                $max: [
                  0,
                  { $subtract: [{ $strLenCP: { $ifNull: ['$customer.phone', ''] } }, 10] },
                ],
              },
              10,
            ],
          },
          name: { $first: '$customer.name' },
          email: { $first: '$customer.email' },
          address: { $first: '$customer.address' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceAmount' },
          firstOrderDate: { $last: '$createdAt' },
          lastOrderDate: { $first: '$createdAt' },
          orders: {
            $push: {
              invoiceNumber: '$invoiceNumber',
              status: '$status',
              grandTotal: '$grandTotal',
              balanceAmount: '$balanceAmount',
              paymentStatus: '$paymentStatus',
              createdAt: '$createdAt',
              itemsSummary: {
                $reduce: {
                  input: '$items',
                  initialValue: '',
                  in: {
                    $concat: [
                      '$$value',
                      { $cond: [{ $eq: ['$$value', ''] }, '', ', '] },
                      { $toString: '$$this.quantity' },
                      'x ',
                      '$$this.name',
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          address: 1,
          totalOrders: 1,
          totalSpent: 1,
          totalPaid: 1,
          totalBalance: 1,
          firstOrderDate: 1,
          lastOrderDate: 1,
          lastThreeOrders: { $slice: ['$orders', 3] },
        },
      },
      { $sort: { lastOrderDate: -1 } },
      {
        $facet: {
          metrics: [
            {
              $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                repeatCustomers: {
                  $sum: { $cond: [{ $gte: ['$totalOrders', 2] }, 1, 0] },
                },
                totalOrders: { $sum: '$totalOrders' },
                totalRevenue: { $sum: '$totalSpent' },
              },
            },
          ],
          customers: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const [facetResult] = await OrderInvoice.aggregate(pipeline);
    const rawMetrics = facetResult?.metrics?.[0] || {
      totalCustomers: 0,
      repeatCustomers: 0,
      totalOrders: 0,
      totalRevenue: 0,
    };
    const pagedRows = facetResult?.customers || [];

    // Fetch registered User flags ONLY for the paginated customers on this page
    const pagePhoneVariants = Array.from(
      new Set(
        pagedRows.flatMap((row: { _id: string }) => {
          const clean = normalizeIndianPhone(row._id) || row._id;
          return buildPhoneVariants(clean);
        })
      )
    );

    const registeredUsers =
      pagePhoneVariants.length > 0
        ? await User.find({
            role: 'customer',
            phone: { $in: pagePhoneVariants },
          })
            .select('name phone email')
            .lean()
        : [];

    const registeredMap = new Map<string, (typeof registeredUsers)[0]>();
    registeredUsers.forEach((u) => {
      if (u.phone) {
        const clean = normalizeIndianPhone(u.phone);
        if (clean) registeredMap.set(clean, u);
      }
    });

    const customers = pagedRows.map((c: {
      _id: string;
      name?: string;
      email?: string;
      address?: string;
      totalOrders: number;
      totalSpent: number;
      totalPaid: number;
      totalBalance: number;
      firstOrderDate?: Date | string;
      lastOrderDate?: Date | string;
      lastThreeOrders: Array<{
        invoiceNumber: string;
        status: string;
        grandTotal: number;
        balanceAmount: number;
        paymentStatus: string;
        createdAt: Date | string;
        itemsSummary?: string;
      }>;
    }) => {
      const cleanPhone = normalizeIndianPhone(c._id) || String(c._id || '').trim();
      const regUser = registeredMap.get(cleanPhone);
      const displayName = c.name || regUser?.name || 'Valued Customer';
      const address = c.address || 'Chattarpur / Delhi NCR';
      const lastThreeOrders = Array.isArray(c.lastThreeOrders) ? c.lastThreeOrders : [];

      return {
        id: cleanPhone,
        name: displayName,
        phone: cleanPhone,
        email: c.email || regUser?.email || '',
        address,
        isRegistered: Boolean(regUser),
        totalOrders: c.totalOrders || 0,
        totalSpent: c.totalSpent || 0,
        totalPaid: c.totalPaid || 0,
        totalBalance: c.totalBalance || 0,
        firstOrderDate: c.firstOrderDate,
        lastOrderDate: c.lastOrderDate,
        orders: lastThreeOrders,
        lastThreeOrders,
        actions: buildCustomerActions(displayName, cleanPhone, c.address),
      };
    });

    const totalCustomers = rawMetrics.totalCustomers || 0;

    return NextResponse.json(
      {
        success: true,
        customers,
        metrics: {
          totalCustomers,
          repeatCustomers: rawMetrics.repeatCustomers || 0,
          totalOrders: rawMetrics.totalOrders || 0,
          totalRevenue: rawMetrics.totalRevenue || 0,
        },
        dateFilter: dateRangeFilter
          ? { startDate: startDateParam, endDate: endDateParam }
          : null,
        pagination: {
          total: totalCustomers,
          page,
          totalPages: Math.max(1, Math.ceil(totalCustomers / limit)),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load admin customers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load customers', error: errorMsg },
      { status: 500 }
    );
  }
}
