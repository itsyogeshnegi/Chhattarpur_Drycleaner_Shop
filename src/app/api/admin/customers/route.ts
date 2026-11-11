import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { User } from '@/models/User';
import { normalizeIndianPhone } from '@/lib/phone';

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
        const cleanPhone = normalizeIndianPhone(u.phone);
        if (cleanPhone) {
          registeredPhoneMap.set(cleanPhone, u);
        }
      }
    });

    // Deduplicate & Merge customers by strict normalized 10-digit Indian phone number
    // (Prevents "08745073655" and "8745073655" from showing as two separate rows!)
    type RawAggOrder = {
      invoiceNumber: string;
      status: string;
      grandTotal: number;
      balanceAmount: number;
      paymentStatus: string;
      createdAt: Date | string;
      itemsSummary: string;
    };

    interface MergedBucket {
      cleanPhone: string;
      name: string;
      email: string;
      address: string;
      totalOrders: number;
      totalSpent: number;
      totalPaid: number;
      totalBalance: number;
      firstOrderDate: Date;
      lastOrderDate: Date;
      orders: RawAggOrder[];
    }

    const mergedMap = new Map<string, MergedBucket>();

    for (const c of customerAgg) {
      const cleanPhone = normalizeIndianPhone(c.phone || c._id) || String(c._id || '').trim();
      if (!cleanPhone) continue;

      const existing = mergedMap.get(cleanPhone);
      const firstDate = c.firstOrderDate ? new Date(c.firstOrderDate) : new Date();
      const lastDate = c.lastOrderDate ? new Date(c.lastOrderDate) : new Date();
      const rawOrders: RawAggOrder[] = Array.isArray(c.orders) ? c.orders : [];

      if (existing) {
        existing.totalOrders += c.totalOrders || 0;
        existing.totalSpent += c.totalSpent || 0;
        existing.totalPaid += c.totalPaid || 0;
        existing.totalBalance += c.totalBalance || 0;
        if (firstDate < existing.firstOrderDate) existing.firstOrderDate = firstDate;
        if (lastDate > existing.lastOrderDate) {
          existing.lastOrderDate = lastDate;
          if (c.name) existing.name = c.name;
          if (c.email) existing.email = c.email;
          if (c.address) existing.address = c.address;
        } else {
          if (!existing.name && c.name) existing.name = c.name;
          if (!existing.email && c.email) existing.email = c.email;
          if (!existing.address && c.address) existing.address = c.address;
        }
        existing.orders.push(...rawOrders);
      } else {
        mergedMap.set(cleanPhone, {
          cleanPhone,
          name: c.name || '',
          email: c.email || '',
          address: c.address || '',
          totalOrders: c.totalOrders || 0,
          totalSpent: c.totalSpent || 0,
          totalPaid: c.totalPaid || 0,
          totalBalance: c.totalBalance || 0,
          firstOrderDate: firstDate,
          lastOrderDate: lastDate,
          orders: [...rawOrders],
        });
      }
    }

    // Format final unified customer list sorted by newest activity first
    let customers = Array.from(mergedMap.values())
      .sort((a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime())
      .map((c) => {
        const regUser = registeredPhoneMap.get(c.cleanPhone);

        const sortedOrders = [...c.orders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const lastThreeOrders = sortedOrders.slice(0, 3);
        const displayName = c.name || (regUser ? regUser.name : 'Valued Customer');

        return {
          id: c.cleanPhone,
          name: displayName,
          phone: c.cleanPhone,
          email: c.email || (regUser ? regUser.email : ''),
          address: c.address || 'Chattarpur / Delhi NCR',
          isRegistered: !!regUser,
          totalOrders: c.totalOrders,
          totalSpent: c.totalSpent,
          totalPaid: c.totalPaid,
          totalBalance: c.totalBalance,
          firstOrderDate: c.firstOrderDate,
          lastOrderDate: c.lastOrderDate,
          orders: sortedOrders,
          lastThreeOrders,
          actions: {
            whatsappUrl: `https://wa.me/91${c.cleanPhone}?text=${encodeURIComponent(
              `Hello ${displayName}! Greetings from Al-Haram Dry Cleaners & Laundry Chattarpur. How may we assist you today?`
            )}`,
            posNewOrderUrl: `/admin/counter?customerName=${encodeURIComponent(
              displayName
            )}&customerPhone=${encodeURIComponent(c.cleanPhone)}&customerAddress=${encodeURIComponent(
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

