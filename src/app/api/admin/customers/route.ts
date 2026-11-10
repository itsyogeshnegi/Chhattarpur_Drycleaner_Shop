import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';

    // Aggregate customers from OrderInvoice
    const customerAgg = await OrderInvoice.aggregate([
      {
        $group: {
          _id: '$customer.phone',
          name: { $last: '$customer.name' },
          phone: { $last: '$customer.phone' },
          email: { $last: '$customer.email' },
          address: { $last: '$customer.address' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceAmount' },
          firstOrderDate: { $min: '$createdAt' },
          lastOrderDate: { $max: '$createdAt' },
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
                      '$$this.name'
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $sort: { lastOrderDate: -1 }
      }
    ]);

    // Also get all registered customer accounts from User model
    const registeredUsers = await User.find({ role: 'customer' })
      .select('name phone email createdAt')
      .lean();

    const registeredPhoneMap = new Map<string, typeof registeredUsers[0]>();
    registeredUsers.forEach((u) => {
      if (u.phone) {
        const cleanPhone = u.phone.replace(/\D/g, '').slice(-10);
        registeredPhoneMap.set(cleanPhone, u);
      }
    });

    // Merge and format customer records
    let customers = customerAgg.map((c) => {
      const cleanPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
      const regUser = registeredPhoneMap.get(cleanPhone);

      // Sort customer orders by newest first
      const sortedOrders = Array.isArray(c.orders)
        ? [...c.orders].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : [];

      // Last 3 distinct actions
      const lastThreeOrders = sortedOrders.slice(0, 3);

      return {
        id: c._id || c.phone,
        name: c.name || (regUser ? regUser.name : 'Valued Customer'),
        phone: c.phone || cleanPhone,
        email: c.email || (regUser ? regUser.email : ''),
        address: c.address || 'Chattarpur / Delhi NCR',
        isRegistered: !!regUser,
        totalOrders: c.totalOrders || 0,
        totalSpent: c.totalSpent || 0,
        totalPaid: c.totalPaid || 0,
        totalBalance: c.totalBalance || 0,
        firstOrderDate: c.firstOrderDate,
        lastOrderDate: c.lastOrderDate,
        orders: sortedOrders,
        lastThreeOrders,
        // Pre-computed three actions
        actions: {
          whatsappUrl: `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
            `Hello ${c.name || 'Valued Customer'}! Greetings from Al-Haram Dry Cleaners & Laundry Chattarpur. How may we assist you today?`
          )}`,
          posNewOrderUrl: `/admin/counter?customerName=${encodeURIComponent(
            c.name || ''
          )}&customerPhone=${encodeURIComponent(cleanPhone)}&customerAddress=${encodeURIComponent(
            c.address || ''
          )}`,
        },
      };
    });

    // If search filter is active
    if (search) {
      const lower = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.phone.includes(lower) ||
          (c.address && c.address.toLowerCase().includes(lower))
      );
    }

    // High level metrics
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((c) => c.totalOrders >= 2).length;
    const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    return NextResponse.json({
      success: true,
      customers,
      metrics: {
        totalCustomers,
        repeatCustomers,
        totalOrders,
        totalRevenue,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load admin customers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load customers', error: errorMsg },
      { status: 500 }
    );
  }
}

