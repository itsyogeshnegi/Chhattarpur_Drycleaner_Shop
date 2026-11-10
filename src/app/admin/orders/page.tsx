'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  CheckCircle,
  RefreshCw,
  Phone,
  MessageSquare,
  FileText,
  Send,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { generateWhatsAppInvoiceUrl, generateWhatsAppReadyAlertUrl } from '@/lib/whatsapp';

interface OrderRecord {
  _id: string;
  invoiceNumber: string;
  customer: { name: string; phone: string; address?: string };
  status: 'received' | 'in_process' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: Array<{ name: string; serviceType: string; quantity: number; total: number; notes?: string }>;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  rackLocation?: string;
  smsNotificationSent: boolean;
  smsSentAt?: string;
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

  // Update Status
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

  // Trigger SMS Alert via WhatsApp + Record in DB
  const handleTriggerWhatsAppSms = async (ord: OrderRecord) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const invoiceUrl = `${origin}/invoice/${ord.invoiceNumber}`;
    const itemsSummary = ord.items.map((i) => `${i.quantity}x ${i.name}`).slice(0, 3).join(', ');

    const waUrl = generateWhatsAppReadyAlertUrl({
      customerName: ord.customer.name,
      customerPhone: ord.customer.phone,
      invoiceNumber: ord.invoiceNumber,
      grandTotal: ord.grandTotal,
      balanceAmount: ord.balanceAmount,
      status: ord.status,
      itemsCount: ord.items.reduce((acc, i) => acc + (i.quantity || 1), 0),
      itemsSummary,
      invoiceUrl,
    });

    // Open WhatsApp in a new tab immediately
    window.open(waUrl, '_blank');

    // Trigger backend update to mark SMS sent in DB
    try {
      setSmsSendingId(ord._id);
      const res = await fetch(`/api/orders/${ord._id}/sms`, { method: 'POST' });
      const data = await res.json();
      
      setFeedbackMessage(
        `WhatsApp SMS alert opened for ${ord.customer.name} (${ord.customer.phone}). Status recorded as sent!`
      );
      
      // Optimistically update order
      setOrders((prev) =>
        prev.map((o) => (o._id === ord._id ? { ...o, smsNotificationSent: true } : o))
      );
    } catch (err) {
      console.error('Failed to record SMS alert status:', err);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs uppercase font-extrabold text-brand-700 tracking-wider">
            {initialView === 'invoices' ? 'Billing & Dual Invoices' : 'Order & Delivery Pipeline'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {initialView === 'invoices' ? 'Invoices & Customer Receipts' : 'Delivery & Clothes Tracking'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track garment cleaning lifecycle, trigger automated & WhatsApp SMS ready alerts, and dispatch WhatsApp invoices.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Pipeline
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-950 font-bold hover:underline ml-4"
          >
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
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Scroll indicator for mobile */}
      <div className="sm:hidden text-[10px] text-slate-400 font-medium text-center">
        ← Swipe horizontally to view all table columns →
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 min-w-[150px] whitespace-nowrap">Invoice #</th>
                <th className="py-3.5 px-4 min-w-[170px]">Customer</th>
                <th className="py-3.5 px-4 min-w-[240px]">Order Products & Garments</th>
                <th className="py-3.5 px-4 min-w-[100px]">Rack Tag</th>
                <th className="py-3.5 px-4 min-w-[120px]">Total / Balance</th>
                <th className="py-3.5 px-4 min-w-[170px]">Stage / Delivery Status</th>
                <th className="py-3.5 px-4 min-w-[150px]">SMS / WhatsApp Alert</th>
                <th className="py-3.5 px-4 text-right min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
                      <span>Loading orders pipeline...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/80 transition align-top">
                    {/* Invoice ID - no wrapping */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="text-brand-600 hover:text-brand-800 underline decoration-dotted font-bold text-xs"
                      >
                        {ord.invoiceNumber}
                      </Link>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-xs">
                        {ord.customer.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a
                          href={`tel:${ord.customer.phone}`}
                          className="text-[10px] text-slate-500 font-mono hover:text-brand-600 flex items-center gap-1"
                          title="Call Customer"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          {ord.customer.phone}
                        </a>
                      </div>
                      {ord.customer.address && (
                        <p className="text-[9px] text-slate-400 mt-1 line-clamp-1 max-w-[160px]" title={ord.customer.address}>
                          📍 {ord.customer.address}
                        </p>
                      )}
                    </td>

                    {/* Dedicated Column: Order Products with Customer Name correlation */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {ord.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} items total
                          </span>
                          <span className="text-[10px] text-slate-400">for {ord.customer.name.split(' ')[0]}</span>
                        </div>

                        {/* List of individual ordered garments */}
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {ord.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-brand-700 shrink-0">
                                  {item.quantity}×
                                </span>
                                <span className="font-medium text-slate-800 truncate" title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  item.serviceType === 'dry_clean'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : item.serviceType === 'steam_iron'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {item.serviceType === 'dry_clean'
                                  ? 'Dry Clean'
                                  : item.serviceType === 'steam_iron'
                                  ? 'Press'
                                  : item.serviceType.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Rack location */}
                    <td className="py-3.5 px-4">
                      {ord.rackLocation ? (
                        <span className="font-mono font-bold text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-md inline-block">
                          {ord.rackLocation}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Total & Balance */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 text-xs">₹{ord.grandTotal}</span>
                      <p className="text-[10px] mt-0.5">
                        {ord.balanceAmount > 0 ? (
                          <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Bal: ₹{ord.balanceAmount}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            ✓ Paid
                          </span>
                        )}
                      </p>
                    </td>

                    {/* Delivery Status Dropdown */}
                    <td className="py-3.5 px-4">
                      <select
                        value={ord.status}
                        disabled={updatingId === ord._id}
                        onChange={(e) => handleUpdateStatus(ord._id, e.target.value)}
                        className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border transition cursor-pointer ${
                          ord.status === 'ready'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : ord.status === 'delivered'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : ord.status === 'out_for_delivery'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <option value="received">📥 Received</option>
                        <option value="in_process">🧼 In Process</option>
                        <option value="ready">✅ Ready for Collection</option>
                        <option value="out_for_delivery">🛵 Out for Delivery</option>
                        <option value="delivered">🎉 Delivered</option>
                        <option value="cancelled">❌ Cancelled</option>
                      </select>
                    </td>

                    {/* SMS Alert -> Trigger SMS on WhatsApp */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleTriggerWhatsAppSms(ord)}
                        disabled={smsSendingId === ord._id}
                        title="Click to send status alert to customer on WhatsApp"
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs ${
                          ord.smsNotificationSent
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-brand-600 text-white border-brand-700 hover:bg-brand-700'
                        }`}
                      >
                        {ord.smsNotificationSent ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp Sent</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-white" />
                            <span>SMS on WhatsApp</span>
                          </>
                        )}
                      </button>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {ord.smsNotificationSent ? 'Click to re-send alert' : 'Sends instant WhatsApp'}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* WhatsApp Deep link Bill */}
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
                        title="Send Full Bill on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>

                      {/* View Dual Invoice */}
                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1 text-xs font-semibold"
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
