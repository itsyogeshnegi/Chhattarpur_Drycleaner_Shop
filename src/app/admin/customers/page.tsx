'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  MessageSquare,
  FileText,
  ShoppingBag,
  PlusCircle,
  ExternalLink,
  MapPin,
  Clock,
  IndianRupee,
  UserCheck,
  X,
  CheckCircle,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface CustomerOrderSummary {
  invoiceNumber: string;
  status: string;
  grandTotal: number;
  balanceAmount: number;
  paymentStatus: string;
  createdAt: string;
  itemsSummary?: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  isRegistered: boolean;
  totalOrders: number;
  totalSpent: number;
  totalPaid: number;
  totalBalance: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
  orders: CustomerOrderSummary[];
  lastThreeOrders: CustomerOrderSummary[];
  actions: {
    whatsappUrl: string;
    posNewOrderUrl: string;
  };
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    repeatCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerRecord | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Ready</span>;
      case 'in_process':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">In Process</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Delivered</span>;
      case 'out_for_delivery':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Out for Delivery</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">Received</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-extrabold text-brand-700 tracking-wider block">
            Customer Directory &amp; CRM
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Customers List
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View customer details, lifetime spending history, and execute the 3 key actions (WhatsApp, Order History, New Order).
          </p>
        </div>

        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Customers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.totalCustomers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Profiles recorded in database</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Repeat Clients</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.repeatCustomers}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {metrics.totalCustomers > 0
              ? `${Math.round((metrics.repeatCustomers / metrics.totalCustomers) * 100)}% return rate`
              : 'Loyalty active'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.totalOrders}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Combined customer bookings</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">₹{metrics.totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Lifetime customer billing</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative grow">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by Name, Mobile Number, or Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-brand-500 focus:outline-hidden"
          />
        </div>
        <button
          onClick={fetchCustomers}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
        >
          Search
        </button>
      </div>

      {/* Customers Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer Name &amp; Profile</th>
                <th className="py-3 px-4">Contact &amp; Address</th>
                <th className="py-3 px-3 text-center">Orders &amp; Total Spend</th>
                <th className="py-3 px-4">Last Activity / Order</th>
                <th className="py-3 px-4 text-center">Three Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
                      <span>Loading customers directory...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No customers found matching &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                    {/* Customer Name & Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">
                            {cust.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {cust.isRegistered ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                                Registered User
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                                Walk-in / Counter
                              </span>
                            )}
                            {cust.totalOrders >= 2 && (
                              <span className="text-[9px] font-bold text-brand-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">
                                Repeat
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact & Address */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <a
                          href={`tel:${cust.phone}`}
                          className="font-mono text-xs font-bold text-slate-700 hover:text-brand-600 flex items-center gap-1.5"
                          title="Call Customer"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </a>
                        {cust.address && (
                          <p className="text-[11px] text-slate-500 flex items-start gap-1 max-w-[200px] leading-tight">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate" title={cust.address}>
                              {cust.address}
                            </span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Orders & Total Spend */}
                    <td className="py-3 px-3 text-center">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-xs text-brand-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full inline-block">
                          {cust.totalOrders} {cust.totalOrders === 1 ? 'Order' : 'Orders'}
                        </span>
                        <div className="font-bold text-slate-900 text-xs pt-0.5">
                          ₹{cust.totalSpent.toLocaleString('en-IN')}
                        </div>
                        {cust.totalBalance > 0 ? (
                          <p className="text-[10px] font-bold text-red-600">
                            Bal: ₹{cust.totalBalance}
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-emerald-600">
                            Fully Paid
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Last Activity / Order */}
                    <td className="py-3 px-4">
                      {cust.lastThreeOrders.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/invoices/${cust.lastThreeOrders[0].invoiceNumber}`}
                              className="font-mono font-bold text-xs text-brand-600 hover:underline"
                            >
                              {cust.lastThreeOrders[0].invoiceNumber}
                            </Link>
                            {getStatusBadge(cust.lastThreeOrders[0].status)}
                          </div>
                          {cust.lastThreeOrders[0].itemsSummary && (
                            <p className="text-[10px] text-slate-500 truncate max-w-[180px]" title={cust.lastThreeOrders[0].itemsSummary}>
                              {cust.lastThreeOrders[0].itemsSummary}
                            </p>
                          )}
                          <p className="text-[9px] text-slate-400">
                            {new Date(cust.lastThreeOrders[0].createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">No orders yet</span>
                      )}
                    </td>

                    {/* THREE LAST ACTIONS */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Action 1: WhatsApp Message */}
                        <a
                          href={cust.actions.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          title="Action 1: Chat with Customer on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        {/* Action 2: View Orders & Invoices History */}
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForHistory(cust)}
                          className="bg-blue-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          title="Action 2: View Past Orders & Invoices History"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Invoices ({cust.totalOrders})</span>
                        </button>

                        {/* Action 3: New Order (POS) */}
                        <Link
                          href={cust.actions.posNewOrderUrl}
                          className="bg-slate-900 hover:bg-brand-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          title="Action 3: Create New Order in Counter POS"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>New Order</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Orders History Modal (Action 2 Detail View) */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                  {selectedCustomerForHistory.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedCustomerForHistory.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedCustomerForHistory.phone} &bull; {selectedCustomerForHistory.address}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Customer Lifetime Stats & Full Orders History */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 grow">
              {/* Top Stats Banner */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Bookings</span>
                  <p className="text-sm font-extrabold text-slate-900">{selectedCustomerForHistory.totalOrders} Orders</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Paid</span>
                  <p className="text-sm font-extrabold text-emerald-600">₹{selectedCustomerForHistory.totalPaid}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Outstanding</span>
                  <p className="text-sm font-extrabold text-slate-900">
                    ₹{selectedCustomerForHistory.totalBalance}
                  </p>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Complete Order History ({selectedCustomerForHistory.orders.length})
                </h4>

                {selectedCustomerForHistory.orders.map((ord) => (
                  <div
                    key={ord.invoiceNumber}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-brand-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-brand-600">
                          {ord.invoiceNumber}
                        </span>
                        {getStatusBadge(ord.status)}
                        <span className="text-[10px] text-slate-400">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {ord.itemsSummary && (
                        <p className="text-xs text-slate-600 leading-tight">
                          {ord.itemsSummary}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-slate-900">₹{ord.grandTotal}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{ord.paymentStatus}</p>
                      </div>

                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      >
                        <span>View Bill</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
              <a
                href={selectedCustomerForHistory.actions.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message on WhatsApp</span>
              </a>

              <Link
                href={selectedCustomerForHistory.actions.posNewOrderUrl}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create New Order for Customer</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

