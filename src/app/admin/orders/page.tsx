'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  Truck,
  MessageSquare,
  FileText,
  Send,
  RefreshCw,
  AlertCircle,
  Phone,
  Tag,
} from 'lucide-react';
import { generateWhatsAppInvoiceUrl } from '@/lib/whatsapp';

interface OrderRecord {
  _id: string;
  invoiceNumber: string;
  customer: { name: string; phone: string; address?: string };
  status: 'received' | 'in_process' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: Array<{ name: string; serviceType: string; quantity: number; total: number }>;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  rackLocation?: string;
  smsNotificationSent: boolean;
  createdAt: string;
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'orders';

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [smsSendingId, setSmsSendingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== 'all') query.set('status', statusFilter);
      if (search) query.set('search', search);

      const res = await fetch(`/api/orders?${query.toString()}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Update Status (Requirement 4 & 5)
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, triggerSms: true }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(
          `Status updated to "${newStatus.replace('_', ' ')}". ${
            data.smsResult?.message ? `SMS: ${data.smsResult.message}` : ''
          }`
        );
        fetchOrders();
      } else {
        alert(data.message || 'Status update failed');
      }
    } catch {
      alert('Network error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Manual Trigger SMS (Requirement 5)
  const handleSendSms = async (orderId: string) => {
    try {
      setSmsSendingId(orderId);
      const res = await fetch(`/api/orders/${orderId}/sms`, { method: 'POST' });
      const data = await res.json();
      setFeedbackMessage(data.message || 'SMS dispatched');
      fetchOrders();
    } catch {
      alert('Failed to send SMS');
    } finally {
      setSmsSendingId(null);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'received', label: 'Received (In Wash)' },
    { value: 'in_process', label: 'In Pressing / Cleaning' },
    { value: 'ready', label: 'Ready for Collection' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered / Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs uppercase font-extrabold text-brand-700 tracking-wider">
            {initialView === 'invoices' ? 'Billing & Dual Invoices' : 'Order & Delivery Pipeline'}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {initialView === 'invoices' ? 'Invoices & Customer Receipts' : 'Delivery & Clothes Tracking'}
          </h1>
          <p className="text-xs text-slate-500">
            Track garment cleaning lifecycle, trigger automated & manual SMS ready alerts, and dispatch WhatsApp invoices.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-950 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative grow">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Mobile Number, or Customer Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Garments</th>
                <th className="py-3 px-4">Rack Tag</th>
                <th className="py-3 px-4">Total / Balance</th>
                <th className="py-3 px-4">Stage / Delivery Status</th>
                <th className="py-3 px-4">SMS Alert</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/70 transition">
                    {/* Invoice ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="text-brand-600 hover:text-brand-800 underline decoration-dotted"
                      >
                        {ord.invoiceNumber}
                      </Link>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {ord.customer.name}
                      <p className="text-[10px] text-slate-500 font-mono">{ord.customer.phone}</p>
                    </td>

                    {/* Garments summary */}
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-bold">{ord.items.length} items</span>
                      <p className="text-[10px] text-slate-400 truncate max-w-32">
                        {ord.items.map((i) => i.name).join(', ')}
                      </p>
                    </td>

                    {/* Rack location */}
                    <td className="py-3 px-4">
                      {ord.rackLocation ? (
                        <span className="font-mono font-bold text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                          {ord.rackLocation}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">—</span>
                      )}
                    </td>

                    {/* Total & Balance */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">₹{ord.grandTotal}</span>
                      <p className="text-[10px]">
                        {ord.balanceAmount > 0 ? (
                          <span className="text-amber-600 font-bold">Bal: ₹{ord.balanceAmount}</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Paid</span>
                        )}
                      </p>
                    </td>

                    {/* Delivery Status (Requirement 4) */}
                    <td className="py-3 px-4">
                      <select
                        value={ord.status}
                        disabled={updatingId === ord._id}
                        onChange={(e) => handleUpdateStatus(ord._id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border transition ${
                          ord.status === 'ready'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : ord.status === 'delivered'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : ord.status === 'out_for_delivery'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <option value="received">Received</option>
                        <option value="in_process">In Process</option>
                        <option value="ready">Ready for Collection</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* SMS Status & Trigger (Requirement 5) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendSms(ord._id)}
                          disabled={smsSendingId === ord._id}
                          title="Trigger Ready SMS to customer"
                          className={`p-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                            ord.smsNotificationSent
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-brand-50 hover:text-brand-700'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          <span>{ord.smsNotificationSent ? 'Sent' : 'Send SMS'}</span>
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* WhatsApp Deep link */}
                      <a
                        href={generateWhatsAppInvoiceUrl({
                          customerName: ord.customer.name,
                          customerPhone: ord.customer.phone,
                          invoiceNumber: ord.invoiceNumber,
                          grandTotal: ord.grandTotal,
                          paymentStatus: ord.paymentStatus,
                          paidAmount: ord.paidAmount,
                          balanceAmount: ord.balanceAmount,
                          items: ord.items,
                          status: ord.status,
                          invoiceUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/invoice/${ord.invoiceNumber}`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg inline-flex items-center gap-1"
                        title="Share on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>

                      {/* View Dual Invoice */}
                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1"
                        title="Dual Invoice (Customer & Internal)"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoices</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading delivery pipeline...</div>}>
      <OrdersContent />
    </Suspense>
  );
}

