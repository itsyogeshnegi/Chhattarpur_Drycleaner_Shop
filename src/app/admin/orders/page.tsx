'use client';

import { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Search,
  CheckCircle,
  RefreshCw,
  Phone,
  MessageSquare,
  FileText,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  X,
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
  deliveryOtp?: string;
  deliveryOtpGeneratedAt?: string;
  deliveryVerifiedAt?: string;
  deliveryVerifiedBy?: string;
  deliveredAt?: string;
  smsNotificationSent: boolean;
  smsSentAt?: string;
  createdAt: string;
}

function OrdersContent() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [smsSendingId, setSmsSendingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // OTP Verification Modal state
  const [otpModalOrder, setOtpModalOrder] = useState<OrderRecord | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

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
    const targetOrder = orders.find((o) => o._id === orderId);

    // If order is Out for Delivery and admin tries to set to Delivered: intercept and require OTP!
    if (newStatus === 'delivered' && targetOrder && targetOrder.status === 'out_for_delivery') {
      setOtpModalOrder(targetOrder);
      setEnteredOtp('');
      setOtpError('');
      return;
    }

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
            newStatus === 'out_for_delivery' && data.order?.deliveryOtp
              ? `Delivery OTP generated: ${data.order.deliveryOtp}`
              : ''
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

  // Verify OTP & Complete Delivery Handover
  const handleVerifyOtpDelivery = async (isOverride = false) => {
    if (!otpModalOrder) return;
    if (!isOverride && !enteredOtp.trim()) {
      setOtpError('Please enter the 4-digit Delivery OTP provided by customer');
      return;
    }

    try {
      setOtpVerifying(true);
      setOtpError('');
      const res = await fetch(`/api/orders/${otpModalOrder._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'delivered',
          otp: enteredOtp.trim(),
          isOverride,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(
          `🎉 Order ${otpModalOrder.invoiceNumber} delivered & customer handover verified successfully!`
        );
        setOtpModalOrder(null);
        setEnteredOtp('');
        fetchOrders();
      } else {
        setOtpError(data.message || 'Invalid Delivery OTP! Please try again.');
      }
    } catch {
      setOtpError('Network error while verifying OTP');
    } finally {
      setOtpVerifying(false);
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
      deliveryOtp: ord.deliveryOtp,
    });

    // Open WhatsApp in a new tab immediately
    window.open(waUrl, '_blank');

    // Trigger backend update to mark SMS sent in DB
    try {
      setSmsSendingId(ord._id);
      const res = await fetch(`/api/orders/${ord._id}/sms`, { method: 'POST' });
      await res.json();

      setFeedbackMessage(
        `WhatsApp SMS alert opened for ${ord.customer.name} (${ord.customer.phone}). Status recorded!`
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
    <div className="space-y-4">
      {/* Header - Unified & Professional */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-extrabold text-brand-700 tracking-wider block">
            Order Lifecycle &amp; Delivery Tracking
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Delivery &amp; Clothes Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track garment cleaning lifecycle, trigger automated &amp; WhatsApp SMS ready alerts, and dispatch customer &amp; internal dual invoices.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-950 font-bold hover:underline ml-4 text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar - Compact */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative grow">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Mobile Number, or Customer Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table Container - Optimized column widths and compact text */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 min-w-[125px] whitespace-nowrap">Invoice #</th>
                <th className="py-2.5 px-3 min-w-[135px]">Customer</th>
                <th className="py-2.5 px-3 min-w-[240px]">Order Products</th>
                <th className="py-2.5 px-2 min-w-[75px]">Rack Tag</th>
                <th className="py-2.5 px-2.5 min-w-[95px]">Total / Bal</th>
                <th className="py-2.5 px-2.5 min-w-[130px]">Stage / Status</th>
                <th className="py-2.5 px-2.5 min-w-[115px]">SMS Alert</th>
                <th className="py-2.5 px-2.5 text-right min-w-[85px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                      <span>Loading orders pipeline...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/70 transition align-middle">
                    {/* Invoice ID */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="text-brand-600 hover:text-brand-800 underline decoration-dotted text-[11px]"
                      >
                        {ord.invoiceNumber}
                      </Link>
                      <p className="text-[9px] text-slate-400 font-normal">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </td>

                    {/* Customer Info */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[130px]">
                        {ord.customer.name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <a
                          href={`tel:${ord.customer.phone}`}
                          className="text-[10px] text-slate-500 font-mono hover:text-brand-600 flex items-center gap-1"
                          title="Call Customer"
                        >
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          {ord.customer.phone}
                        </a>
                      </div>
                      {ord.customer.address && (
                        <p className="text-[9px] text-slate-400 truncate max-w-[130px]" title={ord.customer.address}>
                          📍 {ord.customer.address}
                        </p>
                      )}
                    </td>

                    {/* Dedicated Column: Order Products - Clean, Legible & Properly Visible */}
                    <td className="py-2.5 px-3 min-w-[240px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[10px] text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {ord.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} items
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            for {ord.customer.name.split(' ')[0]}
                          </span>
                        </div>

                        {/* List of ordered garments - Clear, legible, NO cramped scrollbar! */}
                        <div className="space-y-1">
                          {(expandedOrders[ord._id] ? ord.items : ord.items.slice(0, 3)).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 text-xs bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-lg px-2.5 py-1 transition"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-extrabold text-brand-600 text-xs shrink-0">
                                  {item.quantity}×
                                </span>
                                <span className="font-semibold text-slate-800 truncate text-xs" title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                                  item.serviceType === 'dry_clean'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : item.serviceType === 'steam_iron'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {item.serviceType === 'dry_clean'
                                  ? 'DC'
                                  : item.serviceType === 'steam_iron'
                                  ? 'PRESS'
                                  : item.serviceType.replace('_', ' ')}
                              </span>
                            </div>
                          ))}

                          {ord.items.length > 3 && (
                            <button
                              type="button"
                              onClick={() => toggleOrderExpand(ord._id)}
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-800 hover:underline pt-0.5 flex items-center gap-1"
                            >
                              {expandedOrders[ord._id]
                                ? '▲ Show less'
                                : `▼ +${ord.items.length - 3} more garments (View all)`}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Rack location */}
                    <td className="py-2.5 px-2">
                      {ord.rackLocation ? (
                        <span className="font-mono font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded inline-block">
                          {ord.rackLocation}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">—</span>
                      )}
                    </td>

                    {/* Total & Balance */}
                    <td className="py-2.5 px-2.5">
                      <span className="font-bold text-slate-900 text-xs">₹{ord.grandTotal}</span>
                      <p className="text-[9px] mt-0.5">
                        {ord.balanceAmount > 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Bal: ₹{ord.balanceAmount}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            ✓ Paid
                          </span>
                        )}
                      </p>
                    </td>

                    {/* Delivery Status Dropdown */}
                    <td className="py-2.5 px-2.5 min-w-[130px]">
                      <div className="space-y-1">
                        <select
                          value={ord.status}
                          disabled={updatingId === ord._id}
                          onChange={(e) => handleUpdateStatus(ord._id, e.target.value)}
                          className={`text-[11px] font-bold rounded-lg px-2 py-1 border transition cursor-pointer w-full ${
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
                          <option value="ready">✅ Ready</option>
                          <option value="out_for_delivery">🛵 Out for Delivery</option>
                          <option value="delivered">🎉 Delivered</option>
                          <option value="cancelled">❌ Cancelled</option>
                        </select>

                        {/* Out for Delivery Quick OTP Button */}
                        {ord.status === 'out_for_delivery' && (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpModalOrder(ord);
                              setEnteredOtp('');
                              setOtpError('');
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-[10px] px-2 py-1 rounded-md flex items-center justify-center gap-1 shadow-2xs transition"
                            title={`Verify Customer OTP (Expected: ${ord.deliveryOtp || 'Auto'})`}
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Verify OTP {ord.deliveryOtp ? `(${ord.deliveryOtp})` : ''}</span>
                          </button>
                        )}

                        {ord.status === 'delivered' && ord.deliveryVerifiedBy === 'customer_otp' && (
                          <div className="text-[9px] text-emerald-700 font-bold flex items-center gap-0.5 justify-center">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>OTP Verified</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* SMS Alert */}
                    <td className="py-2.5 px-2.5">
                      <button
                        type="button"
                        onClick={() => handleTriggerWhatsAppSms(ord)}
                        disabled={smsSendingId === ord._id}
                        title="Click to send status alert to customer on WhatsApp"
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                          ord.smsNotificationSent
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-brand-600 text-white border-brand-700 hover:bg-brand-700'
                        }`}
                      >
                        {ord.smsNotificationSent ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>WA Sent</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3 h-3 text-white" />
                            <span>SMS Alert</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2.5 text-right space-x-1 whitespace-nowrap">
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
                        className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg inline-flex items-center"
                        title="Send Full Bill on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>

                      {/* View Dual Invoice */}
                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="p-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold"
                        title="Dual Invoice (Customer & Internal)"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Bill</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTP Delivery Verification Modal - Teleported to document.body for dead-center positioning */}
      {mounted && otpModalOrder && createPortal(
        <div
          className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => {
            if (!otpVerifying) setOtpModalOrder(null);
          }}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-700 via-brand-700 to-sky-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shrink-0">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                    Delivery Handover
                  </span>
                  <h3 className="font-extrabold text-base text-white mt-0.5">
                    Verify Customer OTP
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!otpVerifying) setOtpModalOrder(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtpDelivery(false);
              }}
              className="p-6 space-y-5"
            >
              {/* Order Info Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-brand-700">
                    {otpModalOrder.invoiceNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {otpModalOrder.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} Garments
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-900">{otpModalOrder.customer.name}</p>
                  <p className="text-slate-500 font-mono mt-0.5">📞 +91 {otpModalOrder.customer.phone}</p>
                  {otpModalOrder.customer.address && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      📍 {otpModalOrder.customer.address}
                    </p>
                  )}
                </div>

                {/* Outstanding Payment Reminder */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Payment Status:</span>
                  {otpModalOrder.balanceAmount > 0 ? (
                    <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚠️ Collect ₹{otpModalOrder.balanceAmount}
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ Fully Paid (₹{otpModalOrder.grandTotal})
                    </span>
                  )}
                </div>
              </div>

              {/* OTP Input Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                  Enter 4-Digit Delivery OTP
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoFocus
                    placeholder="• • • •"
                    value={enteredOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEnteredOtp(val);
                      if (otpError) setOtpError('');
                    }}
                    className="w-48 py-3 text-center font-mono font-black text-2xl tracking-[0.5em] bg-white border-2 border-indigo-500 rounded-2xl focus:outline-hidden focus:ring-4 focus:ring-indigo-100 shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  Ask the customer to share the 4-digit code shown on their tracking screen.
                </p>
                {otpModalOrder.deliveryOtp && (
                  <p className="text-[10px] text-indigo-600 font-medium text-center bg-indigo-50 py-1 px-2 rounded-lg border border-indigo-100">
                    System Expected OTP: <strong className="font-mono font-bold">{otpModalOrder.deliveryOtp}</strong>
                  </p>
                )}
              </div>

              {/* Error Message */}
              {otpError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={otpVerifying || enteredOtp.length < 4}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {otpVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Handover...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Verify OTP &amp; Mark Delivered</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Bypass OTP check and mark this order directly as Delivered?')) {
                        handleVerifyOtpDelivery(true);
                      }
                    }}
                    className="text-slate-400 hover:text-slate-700 underline text-[10px]"
                  >
                    Customer phone dead? Admin Direct Override
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpModalOrder(null)}
                    className="text-slate-500 hover:text-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-xs text-slate-400">Loading delivery pipeline...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
