'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
  CreditCard,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { generateWhatsAppInvoiceUrl, generateWhatsAppReadyAlertUrl } from '@/lib/whatsapp';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

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
  deliveryVerifiedAt?: string;
  deliveryVerifiedBy?: string;
  deliveredAt?: string;
  smsNotificationSent: boolean;
  smsSentAt?: string;
  createdAt: string;
}

const ORDER_STATUS_STYLES: Record<OrderRecord['status'], string> = {
  received: 'bg-amber-50 text-amber-800 border-amber-200',
  in_process: 'bg-sky-50 text-sky-800 border-sky-200',
  ready: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  out_for_delivery: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ORDER_STATUS_CHOICES: Array<{ value: OrderRecord['status']; label: string }> = [
  { value: 'received', label: 'Received' },
  { value: 'in_process', label: 'In Process' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatServiceLabel(serviceType: string): string {
  if (serviceType === 'dry_clean') return 'DC';
  if (serviceType === 'steam_iron') return 'Press';
  return serviceType.replace('_', ' ');
}

function getServiceBadgeClass(serviceType: string): string {
  if (serviceType === 'dry_clean') return 'text-sky-700 bg-sky-50';
  if (serviceType === 'steam_iron') return 'text-amber-700 bg-amber-50';
  return 'text-emerald-700 bg-emerald-50';
}

function buildWhatsAppBillHref(ord: OrderRecord): string {
  return generateWhatsAppInvoiceUrl({
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
  });
}

function OrdersContent() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
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

  // Record Payment Modal state
  const [paymentModalOrder, setPaymentModalOrder] = useState<OrderRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'online_razorpay' | 'upi' | 'cash' | 'card'>(
    'online_razorpay'
  );
  const [paymentAmountMode, setPaymentAmountMode] = useState<'full' | 'custom' | 'settle'>('full');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentTxRef, setPaymentTxRef] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [settleConfirmation, setSettleConfirmation] = useState<{
    cleanCollected: number;
    waived: number;
  } | null>(null);
  const paymentAmountInputRef = useRef<HTMLInputElement | null>(null);

  const switchToCustomAmount = () => {
    setPaymentAmountMode('custom');
    setPaymentAmountInput('');
    setPaymentError('');
    setSettleConfirmation(null);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        paymentAmountInputRef.current?.focus();
      });
    }
  };

  const openPaymentModal = (ord: OrderRecord) => {
    setPaymentModalOrder(ord);
    setPaymentMethod('online_razorpay');
    setPaymentAmountMode('full');
    setPaymentAmountInput(String(ord.balanceAmount));
    setPaymentTxRef('');
    setPaymentError('');
    setSettleConfirmation(null);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useBodyScrollLock(Boolean(otpModalOrder) || Boolean(paymentModalOrder));

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const fetchOrders = async (targetPage = page) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== 'all') query.set('status', statusFilter);
      if (search) query.set('search', search);
      query.set('page', String(targetPage));

      const res = await fetch(`/api/orders?${query.toString()}`, { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success && data.orders) {
        setAuthRequired(false);
        setOrders(data.orders);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

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
            newStatus === 'out_for_delivery'
              ? "Customer's 4-digit Delivery OTP is now active on their tracking page."
              : ''
          }`
        );
        if (data.order) {
          setOrders((prev) =>
            statusFilter !== 'all' && data.order.status !== statusFilter
              ? prev.filter((o) => o._id !== orderId)
              : prev.map((o) => (o._id === orderId ? { ...o, ...data.order } : o))
          );
        }
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
        const verifiedOrderId = otpModalOrder._id;
        setFeedbackMessage(
          `🎉 Order ${otpModalOrder.invoiceNumber} delivered & customer handover verified successfully!`
        );
        if (data.order) {
          setOrders((prev) =>
            statusFilter !== 'all' && data.order.status !== statusFilter
              ? prev.filter((o) => o._id !== verifiedOrderId)
              : prev.map((o) => (o._id === verifiedOrderId ? { ...o, ...data.order } : o))
          );
        }
        setOtpModalOrder(null);
        setEnteredOtp('');
      } else {
        setOtpError(data.message || 'Invalid Delivery OTP! Please try again.');
      }
    } catch {
      setOtpError('Network error while verifying OTP');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Request in-modal settlement confirmation (no browser window.confirm pop-up)
  const requestSettleConfirmation = (collectedOverride?: number) => {
    if (!paymentModalOrder) return;

    const rawAmount =
      collectedOverride !== undefined
        ? collectedOverride
        : paymentAmountMode === 'settle'
        ? Number(paymentAmountInput || 0)
        : paymentAmountMode === 'full'
        ? 0
        : Number(paymentAmountInput || 0);

    const cleanCollected = Math.max(
      0,
      Math.min(paymentModalOrder.balanceAmount, Number.isFinite(rawAmount) ? rawAmount : 0)
    );
    const waived = Math.max(
      0,
      Math.round((paymentModalOrder.balanceAmount - cleanCollected) * 100) / 100
    );

    setPaymentError('');
    setSettleConfirmation({ cleanCollected, waived });
  };

  // Execute settlement via backend API
  const executeSettle = async (cleanCollected: number, waived: number) => {
    if (!paymentModalOrder) return;

    setPaymentSaving(true);
    setPaymentError('');
    try {
      const res = await fetch(`/api/orders/${paymentModalOrder._id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          settle: true,
          collectedAmount: cleanCollected,
          transactionRef: paymentTxRef.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === paymentModalOrder._id ? { ...o, ...data.order } : o))
        );
        setFeedbackMessage(
          waived > 0
            ? `Invoice #${paymentModalOrder.invoiceNumber} SETTLED: ₹${cleanCollected} collected, ₹${waived} balance waived. Due: ₹0.`
            : `Invoice #${paymentModalOrder.invoiceNumber} settled in full.`
        );
        setPaymentModalOrder(null);
        setPaymentTxRef('');
        setPaymentAmountInput('');
        setPaymentAmountMode('full');
        setSettleConfirmation(null);
      } else {
        setPaymentError(data.message || 'Failed to settle invoice');
      }
    } catch {
      setPaymentError('Network error while settling invoice.');
    } finally {
      setPaymentSaving(false);
    }
  };

  // Record payment / settle full due or custom partial amount
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder) return;

    if (paymentAmountMode === 'settle') {
      const raw = Number(paymentAmountInput || 0);
      requestSettleConfirmation(Number.isFinite(raw) ? raw : 0);
      return;
    }

    const rawAmount =
      paymentAmountMode === 'full'
        ? paymentModalOrder.balanceAmount
        : Number(paymentAmountInput);
    const collectedAmount = Math.round(rawAmount * 100) / 100;

    if (!Number.isFinite(collectedAmount) || collectedAmount <= 0) {
      setPaymentError('Please enter a payment amount greater than ₹0.');
      return;
    }

    if (collectedAmount > paymentModalOrder.balanceAmount) {
      setPaymentError(
        `Amount cannot exceed due balance of ₹${paymentModalOrder.balanceAmount}.`
      );
      return;
    }

    const markFullPaid = collectedAmount >= paymentModalOrder.balanceAmount;

    setPaymentSaving(true);
    setPaymentError('');
    try {
      const res = await fetch(`/api/orders/${paymentModalOrder._id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          markFullPaid,
          collectedAmount,
          transactionRef: paymentTxRef.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === paymentModalOrder._id ? { ...o, ...data.order } : o))
        );
        const remainingAfter = Number(data.order.balanceAmount || 0);
        setFeedbackMessage(
          remainingAfter === 0
            ? `Payment settled in full (₹${collectedAmount}) for Invoice #${paymentModalOrder.invoiceNumber} via ${paymentMethod.replace('_', ' ').toUpperCase()}.`
            : `Recorded ₹${collectedAmount} payment for Invoice #${paymentModalOrder.invoiceNumber} via ${paymentMethod.replace('_', ' ').toUpperCase()}. Remaining Due: ₹${remainingAfter}.`
        );
        setPaymentModalOrder(null);
        setPaymentTxRef('');
        setPaymentAmountInput('');
      } else {
        setPaymentError(data.message || 'Failed to record payment');
      }
    } catch {
      setPaymentError('Network error while recording payment.');
    } finally {
      setPaymentSaving(false);
    }
  };

  // Trigger SMS Alert via WhatsApp + Record in DB
  const handleTriggerWhatsAppSms = async (ord: OrderRecord) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const invoiceUrl = `${origin}/invoice/${ord.invoiceNumber}`;
    const trackUrl = `${origin}/track?query=${encodeURIComponent(ord.invoiceNumber)}`;
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
      trackUrl,
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

  if (authRequired) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Staff Access Required</h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Please sign in with Store Staff or Admin credentials to manage orders and delivery stages.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition"
        >
          Go to Admin Login
        </Link>
      </div>
    );
  }

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
          onClick={() => fetchOrders(page)}
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
        <div className="relative grow flex gap-2">
          <div className="relative grow">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice #, Mobile Number, or Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (page === 1) fetchOrders(1);
                  else setPage(1);
                }
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (page === 1) fetchOrders(1);
              else setPage(1);
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shrink-0"
          >
            Search
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders List & Table - Responsive & Uncluttered */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {/* Mobile & Narrow Tablet Cards (prevents cramped horizontal scrolling when sidebar is open) */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                <span>Loading orders pipeline...</span>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No orders found matching the filter criteria.
            </div>
          ) : (
            orders.map((ord) => {
              const totalPieces = ord.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
              const isExpanded = !!expandedOrders[ord._id];
              const visibleItems = isExpanded ? ord.items : ord.items.slice(0, 2);

              return (
                <div key={ord._id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/invoices/${ord.invoiceNumber}`}
                          className="font-mono font-bold text-brand-600 hover:text-brand-800 text-xs"
                        >
                          {ord.invoiceNumber}
                        </Link>
                        {ord.rackLocation && (
                          <span className="font-mono font-semibold text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                            Rack {ord.rackLocation}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-900 text-sm">₹{ord.grandTotal}</span>
                      <div className="mt-0.5 flex flex-col items-end gap-0.5">
                        {ord.balanceAmount > 0 ? (
                          <>
                            {ord.paidAmount > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Paid ₹{ord.paidAmount}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openPaymentModal(ord)}
                              className="text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition"
                            >
                              Due ₹{ord.balanceAmount} · Mark Paid
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ Paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900 truncate">{ord.customer.name}</span>
                    <a
                      href={`tel:${ord.customer.phone}`}
                      className="text-[11px] text-slate-500 font-mono hover:text-brand-600 inline-flex items-center gap-1 shrink-0"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      {ord.customer.phone}
                    </a>
                  </div>

                  <div className="bg-slate-50/80 rounded-xl px-3 py-2 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {totalPieces} {totalPieces === 1 ? 'item' : 'items'}
                      </span>
                      {ord.items.length > 2 && (
                        <button
                          type="button"
                          onClick={() => toggleOrderExpand(ord._id)}
                          className="text-brand-600 font-semibold hover:underline"
                        >
                          {isExpanded ? 'Show less' : `+${ord.items.length - 2} more`}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleItems.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200/80 rounded-md px-2 py-0.5 text-slate-700"
                        >
                          <span className="font-bold text-brand-600">{item.quantity}×</span>
                          <span className="truncate max-w-[140px]">{item.name}</span>
                          <span className={`text-[9px] uppercase font-bold px-1 rounded ${getServiceBadgeClass(item.serviceType)}`}>
                            {formatServiceLabel(item.serviceType)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={ord.status}
                        disabled={updatingId === ord._id}
                        onChange={(e) => handleUpdateStatus(ord._id, e.target.value)}
                        className={`text-[11px] font-semibold rounded-lg px-2.5 py-1.5 border transition cursor-pointer ${ORDER_STATUS_STYLES[ord.status]}`}
                      >
                        {ORDER_STATUS_CHOICES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {ord.status === 'out_for_delivery' && (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpModalOrder(ord);
                            setEnteredOtp('');
                            setOtpError('');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 transition"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Verify OTP</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTriggerWhatsAppSms(ord)}
                        disabled={smsSendingId === ord._id}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition ${
                          ord.smsNotificationSent
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-brand-600 text-white border-brand-600'
                        }`}
                      >
                        {ord.smsNotificationSent ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>Sent</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3 h-3" />
                            <span>Alert</span>
                          </>
                        )}
                      </button>

                      <a
                        href={buildWhatsAppBillHref(ord)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg inline-flex items-center"
                        title="Send Full Bill on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>

                      <Link
                        href={`/admin/invoices/${ord.invoiceNumber}`}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Bill</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clean Desktop 5-Column Table (Fits comfortably beside open sidebar without clipping) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Garments</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-4 text-right">Status &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                      <span>Loading orders pipeline...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const totalPieces = ord.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
                  const isExpanded = !!expandedOrders[ord._id];
                  const visibleItems = isExpanded ? ord.items : ord.items.slice(0, 2);

                  return (
                    <tr key={ord._id} className="hover:bg-slate-50/70 transition align-top">
                      {/* Order ID, Date & Optional Rack */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          href={`/admin/invoices/${ord.invoiceNumber}`}
                          className="font-mono font-bold text-brand-600 hover:text-brand-800 hover:underline text-xs"
                        >
                          {ord.invoiceNumber}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        {ord.rackLocation && (
                          <span className="mt-1 inline-block font-mono font-semibold text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                            Rack {ord.rackLocation}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-3 max-w-[165px]">
                        <div className="font-semibold text-slate-900 text-xs truncate" title={ord.customer.name}>
                          {ord.customer.name}
                        </div>
                        <a
                          href={`tel:${ord.customer.phone}`}
                          className="text-[11px] text-slate-500 font-mono hover:text-brand-600 inline-flex items-center gap-1 mt-0.5"
                          title="Call Customer"
                        >
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {ord.customer.phone}
                        </a>
                        {ord.customer.address && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5" title={ord.customer.address}>
                            {ord.customer.address}
                          </p>
                        )}
                      </td>

                      {/* Compact Garments Summary */}
                      <td className="py-3.5 px-3 max-w-[260px]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            {totalPieces} {totalPieces === 1 ? 'item' : 'items'}
                          </span>
                          {ord.items.length > 2 && (
                            <button
                              type="button"
                              onClick={() => toggleOrderExpand(ord._id)}
                              className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 hover:underline cursor-pointer"
                            >
                              {isExpanded ? 'Show less' : `+${ord.items.length - 2} more`}
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {visibleItems.map((item, idx) => (
                            <span
                              key={idx}
                              title={`${item.quantity}× ${item.name} (${item.serviceType.replace('_', ' ')})`}
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200/80 rounded-md px-1.5 py-0.5 text-slate-700"
                            >
                              <span className="font-bold text-brand-600">{item.quantity}×</span>
                              <span className="truncate max-w-[120px]">{item.name}</span>
                              <span className={`text-[9px] uppercase font-bold px-1 rounded ${getServiceBadgeClass(item.serviceType)}`}>
                                {formatServiceLabel(item.serviceType)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">₹{ord.grandTotal}</div>
                        <div className="mt-1 flex flex-col items-start gap-0.5">
                          {ord.balanceAmount > 0 ? (
                            <>
                              {ord.paidAmount > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Paid ₹{ord.paidAmount}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                Due ₹{ord.balanceAmount}
                              </span>
                              <button
                                type="button"
                                onClick={() => openPaymentModal(ord)}
                                className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              ✓ Paid
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stage & Unified Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex flex-col items-end gap-1.5">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <select
                              value={ord.status}
                              disabled={updatingId === ord._id}
                              onChange={(e) => handleUpdateStatus(ord._id, e.target.value)}
                              className={`text-[11px] font-semibold rounded-lg px-2.5 py-1.5 border transition cursor-pointer ${ORDER_STATUS_STYLES[ord.status]}`}
                            >
                              {ORDER_STATUS_CHOICES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleTriggerWhatsAppSms(ord)}
                              disabled={smsSendingId === ord._id}
                              title="Send status alert to customer on WhatsApp"
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                                ord.smsNotificationSent
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700'
                              }`}
                            >
                              {ord.smsNotificationSent ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Sent</span>
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Alert</span>
                                </>
                              )}
                            </button>

                            <a
                              href={buildWhatsAppBillHref(ord)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg inline-flex items-center transition"
                              title="Send Full Bill on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>

                            <Link
                              href={`/admin/invoices/${ord.invoiceNumber}`}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold transition"
                              title="Dual Invoice (Customer & Internal)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Bill</span>
                            </Link>
                          </div>

                          {ord.status === 'out_for_delivery' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOtpModalOrder(ord);
                                setEnteredOtp('');
                                setOtpError('');
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                              title="Ask the customer for their 4-digit Delivery OTP to complete handover"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Verify &amp; Deliver OTP</span>
                            </button>
                          )}

                          {ord.status === 'delivered' && ord.deliveryVerifiedBy === 'customer_otp' && (
                            <span className="text-[10px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              OTP Verified
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700 inline-flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* OTP Delivery Verification Modal - Teleported to document.body for dead-center positioning */}
      {mounted && otpModalOrder && createPortal(
        <div
          className="fixed inset-0 z-[99999] overflow-hidden overscroll-none bg-slate-950/75 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200"
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

      {/* Record Payment Modal */}
      {mounted && paymentModalOrder && createPortal(
        <div
          className="fixed inset-0 z-[99999] overflow-hidden overscroll-none bg-slate-950/75 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => {
            if (!paymentSaving) setPaymentModalOrder(null);
          }}
        >
          <div
            className="relative w-full max-w-md max-h-[94vh] flex flex-col overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 shrink-0 bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                    Counter & Online Settlement
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-white mt-0.5">
                    Record Invoice Payment
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!paymentSaving) setPaymentModalOrder(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleRecordPayment}
              className="p-5 space-y-3 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {(() => {
                const rawTrimmed = paymentAmountInput.trim();
                const parsedCustom = rawTrimmed === '' ? NaN : Number(rawTrimmed);
                const enteredAmount =
                  paymentAmountMode === 'full'
                    ? paymentModalOrder.balanceAmount
                    : paymentAmountMode === 'settle'
                    ? (Number.isFinite(parsedCustom) ? parsedCustom : 0)
                    : Math.round(parsedCustom * 100) / 100;

                const exceedsDue =
                  rawTrimmed !== '' &&
                  Number.isFinite(enteredAmount) &&
                  enteredAmount > paymentModalOrder.balanceAmount;

                const isNonPositive =
                  paymentAmountMode === 'custom' &&
                  rawTrimmed !== '' &&
                  (!Number.isFinite(enteredAmount) || enteredAmount <= 0);

                const clampedAmount = Number.isFinite(enteredAmount)
                  ? Math.max(0, Math.min(paymentModalOrder.balanceAmount, enteredAmount))
                  : 0;

                const remainingAfter = Math.max(
                  0,
                  Math.round((paymentModalOrder.balanceAmount - clampedAmount) * 100) / 100
                );

                const isValidEntered =
                  paymentAmountMode === 'settle'
                    ? !exceedsDue
                    : Number.isFinite(enteredAmount) &&
                      enteredAmount > 0 &&
                      enteredAmount <= paymentModalOrder.balanceAmount;

                return (
                  <>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-brand-700">
                          {paymentModalOrder.invoiceNumber}
                        </span>
                        <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Due: ₹{paymentModalOrder.balanceAmount}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900">{paymentModalOrder.customer.name}</p>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Grand Total: ₹{paymentModalOrder.grandTotal}</span>
                        {paymentModalOrder.paidAmount > 0 && (
                          <span className="font-semibold text-emerald-700">
                            Already Paid: ₹{paymentModalOrder.paidAmount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-700">
                          Amount Received (₹)
                        </label>
                        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentAmountMode('full');
                              setPaymentAmountInput(String(paymentModalOrder.balanceAmount));
                              setPaymentError('');
                              setSettleConfirmation(null);
                            }}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                              paymentAmountMode === 'full'
                                ? 'bg-white text-emerald-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Full Due (₹{paymentModalOrder.balanceAmount})
                          </button>
                          <button
                            type="button"
                            onClick={switchToCustomAmount}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                              paymentAmountMode === 'custom'
                                ? 'bg-white text-brand-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Custom Amount
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentAmountMode('settle');
                              setPaymentAmountInput('');
                              setPaymentError('');
                              setSettleConfirmation(null);
                            }}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                              paymentAmountMode === 'settle'
                                ? 'bg-amber-100 text-amber-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Settle / Waive
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                          ₹
                        </span>
                        <input
                          ref={paymentAmountInputRef}
                          type="number"
                          min={0}
                          max={paymentModalOrder.balanceAmount}
                          step="any"
                          value={
                            paymentAmountMode === 'full'
                              ? String(paymentModalOrder.balanceAmount)
                              : paymentAmountInput
                          }
                          onFocus={() => {
                            if (paymentAmountMode === 'full') {
                              setPaymentAmountMode('custom');
                              setPaymentAmountInput('');
                              setPaymentError('');
                            }
                          }}
                          onChange={(e) => {
                            setPaymentAmountInput(e.target.value);
                            if (paymentError) setPaymentError('');
                          }}
                          placeholder={
                            paymentAmountMode === 'settle'
                              ? `Amount collected (or 0 to waive full ₹${paymentModalOrder.balanceAmount})`
                              : `Enter ₹1 – ₹${paymentModalOrder.balanceAmount}`
                          }
                          className={`w-full pl-8 pr-3 py-2 border rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 ${
                            exceedsDue || isNonPositive
                              ? 'bg-red-50/50 border-red-400 focus:ring-red-400'
                              : paymentAmountMode === 'settle'
                              ? 'bg-amber-50/40 border-amber-300 focus:ring-amber-500'
                              : 'bg-slate-50 border-slate-200 focus:ring-emerald-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] px-1">
                        {exceedsDue ? (
                          <span className="font-semibold text-red-600">
                            Cannot exceed current due amount of ₹{paymentModalOrder.balanceAmount}
                          </span>
                        ) : isNonPositive ? (
                          <span className="font-semibold text-red-600">
                            Enter an amount greater than ₹0
                          </span>
                        ) : paymentAmountMode === 'settle' ? (
                          <span className="font-semibold text-amber-800">
                            ✓ Settle: Collect ₹{clampedAmount} &amp; waive remaining ₹{remainingAfter} (Due becomes ₹0)
                          </span>
                        ) : paymentAmountMode === 'custom' && rawTrimmed === '' ? (
                          <span className="text-slate-400">
                            Enter up to ₹{paymentModalOrder.balanceAmount}
                          </span>
                        ) : (
                          <>
                            <span className="text-slate-500">After this payment:</span>
                            {remainingAfter === 0 && isValidEntered ? (
                              <span className="font-bold text-emerald-700">
                                ✓ Fully Paid (Remaining Due: ₹0)
                              </span>
                            ) : (
                              <span className="font-semibold text-amber-700">
                                Remaining Due: ₹{remainingAfter}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(
                            e.target.value as 'online_razorpay' | 'upi' | 'cash' | 'card'
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="online_razorpay">Razorpay.me / Online Payment</option>
                        <option value="upi">Counter UPI (GPay / PhonePe / Paytm)</option>
                        <option value="cash">Cash at Counter / Delivery</option>
                        <option value="card">Card / POS Machine</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Razorpay Payment ID / UPI Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentTxRef}
                        onChange={(e) => setPaymentTxRef(e.target.value)}
                        placeholder="e.g. pay_Q12345abc or UTR number"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    {paymentError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    {settleConfirmation ? (
                      <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <span>Confirm Order Settlement (₹0 Balance)</span>
                        </div>
                        <div className="text-xs text-slate-700 space-y-1 bg-white p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Collect via {paymentMethod.replace('_', ' ').toUpperCase()}:</span>
                            <strong className="font-extrabold text-slate-900">₹{settleConfirmation.cleanCollected}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Settlement Concession / Waived:</span>
                            <strong className="font-extrabold text-amber-700">₹{settleConfirmation.waived}</strong>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-100">
                            <span className="font-bold text-slate-800">Remaining Balance Due:</span>
                            <strong className="font-extrabold text-emerald-700">₹0 (Paid &amp; Closed)</strong>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-0.5">
                          <button
                            type="button"
                            disabled={paymentSaving}
                            onClick={() => setSettleConfirmation(null)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={paymentSaving}
                            onClick={() =>
                              executeSettle(
                                settleConfirmation.cleanCollected,
                                settleConfirmation.waived
                              )
                            }
                            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>{paymentSaving ? 'Settling...' : 'Confirm & Settle Bill'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={paymentSaving}
                          onClick={() => setPaymentModalOrder(null)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                          Cancel
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Dedicated Settle Button (when customer doesn't want to give more money) */}
                          {paymentAmountMode !== 'settle' && (
                            <button
                              type="button"
                              disabled={paymentSaving}
                              onClick={() =>
                                requestSettleConfirmation(
                                  paymentAmountMode === 'custom' && Number.isFinite(enteredAmount)
                                    ? clampedAmount
                                    : 0
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                              title="Customer doesn't want to pay remaining money: Settle order and waive balance to ₹0"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                              <span>
                                {paymentAmountMode === 'custom' &&
                                Number.isFinite(enteredAmount) &&
                                clampedAmount > 0 &&
                                clampedAmount < paymentModalOrder.balanceAmount
                                  ? `Settle at ₹${clampedAmount} (₹0 Due)`
                                  : 'Settle Bill (₹0 Due)'}
                              </span>
                            </button>
                          )}

                          {/* Primary Button */}
                          <button
                            type="submit"
                            disabled={paymentSaving || !isValidEntered}
                            className={`px-4 py-2 rounded-xl text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${
                              paymentAmountMode === 'settle'
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {paymentAmountMode === 'settle' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>
                            {paymentSaving
                              ? 'Processing...'
                              : paymentAmountMode === 'settle'
                              ? clampedAmount > 0
                                ? `Settle at ₹${clampedAmount} (₹0 Due)`
                                : `Settle & Waive ₹${paymentModalOrder.balanceAmount} Due`
                              : !isValidEntered
                              ? 'Enter Valid Amount'
                              : remainingAfter === 0
                              ? `Mark ₹${clampedAmount} as Paid`
                              : `Collect ₹${clampedAmount}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                );
              })()}
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
