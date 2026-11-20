'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  Printer,
  MessageSquare,
  CreditCard,
  CheckCircle,
  Clock,
  Phone,
  MapPin,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  Camera,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  PhoneCall,
} from 'lucide-react';
import {
  buildRazorpayMeUrl,
  DEFAULT_RAZORPAY_ME_URL,
  generateWhatsAppInvoiceUrl,
} from '@/lib/whatsapp';
import {
  calculatePaymentOptions,
  PaymentPlan,
  resolvePlanPayableAmount,
} from '@/lib/paymentPlan';
import { isRangePriceItem, hasRangePriceItems } from '@/lib/servicePricing';

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on?: (event: string, cb: (res: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface OrderInvoiceData {
  _id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  items: Array<{
    name: string;
    serviceType: string;
    rate: number;
    quantity: number;
    total: number;
    notes?: string;
    inspectionImages?: Array<{ url: string; caption?: string }>;
  }>;
  subtotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod: string;
  status: string;
  rackLocation?: string;
  internalNotes?: string;
  deliveryOtp?: string;
  deliveryVerifiedBy?: string;
  createdAt: string;
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;

  const [invoice, setInvoice] = useState<OrderInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('half');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [razorpayMeBaseUrl, setRazorpayMeBaseUrl] = useState(DEFAULT_RAZORPAY_ME_URL);
  const [serverCheckoutEnabled, setServerCheckoutEnabled] = useState(false);
  const [razorpayMeOpened, setRazorpayMeOpened] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [copiedField, setCopiedField] = useState<'amount' | 'ref' | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [error, setError] = useState('');
  const lastSilentRefreshRef = useRef<number>(0);

  const fetchInvoice = useCallback(
    async (silent = false) => {
      if (silent) setRefreshingStatus(true);
      try {
        const [orderRes, settingsRes] = await Promise.all([
          fetch(`/api/orders/${invoiceId}`, { cache: 'no-store' }),
          silent ? Promise.resolve(null) : fetch('/api/settings').catch(() => null),
        ]);
        const data = await orderRes.json();
        if (data.success && data.order) {
          setInvoice(data.order);
          if (silent && data.order.paymentStatus === 'paid') {
            setPaymentSuccess(true);
            setRazorpayMeOpened(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else if (!silent) {
          setError(data.message || 'Invoice not found');
        }

        if (settingsRes?.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData?.success && settingsData.settings?.razorpayMeUrl) {
            setRazorpayMeBaseUrl(settingsData.settings.razorpayMeUrl);
          }
          if (typeof settingsData?.checkoutEnabled === 'boolean') {
            setServerCheckoutEnabled(settingsData.checkoutEnabled);
          }
        }
      } catch {
        if (!silent) setError('Failed to load invoice');
      } finally {
        setLoading(false);
        setRefreshingStatus(false);
      }
    },
    [invoiceId]
  );

  useEffect(() => {
    fetchInvoice(false);
  }, [fetchInvoice]);

  useEffect(() => {
    if (!razorpayMeOpened || invoice?.paymentStatus === 'paid') return;

    const handleReturnRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastSilentRefreshRef.current < 4000) return;
      lastSilentRefreshRef.current = now;
      fetchInvoice(true);
    };

    window.addEventListener('focus', handleReturnRefresh);
    document.addEventListener('visibilitychange', handleReturnRefresh);
    return () => {
      window.removeEventListener('focus', handleReturnRefresh);
      document.removeEventListener('visibilitychange', handleReturnRefresh);
    };
  }, [razorpayMeOpened, invoice?.paymentStatus, fetchInvoice]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async (field: 'amount' | 'ref', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const handleRazorpayPayment = async () => {
    if (!invoice) return;
    setPaying(true);
    setPaymentError('');
    setPopupBlocked(false);

    const { amount: currentPayable, effectivePlan } = resolvePlanPayableAmount(
      invoice.grandTotal,
      invoice.paidAmount,
      paymentPlan
    );

    try {
      // 1. Create order or payment link on server
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.invoiceNumber,
          paymentPlan: effectivePlan,
        }),
      });
      const orderData = await res.json();

      if (!orderData.success) {
        setPaymentError(orderData.message || 'Failed to initiate payment');
        setPaying(false);
        return;
      }

      if (orderData.mode === 'payment_link') {
        const targetUrl =
          orderData.razorpayMeUrl || buildRazorpayMeUrl(razorpayMeBaseUrl);
        const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        setPopupBlocked(!opened);
        setRazorpayMeOpened(targetUrl);
        setPaying(false);
        return;
      }

      // 2. Full Standard Razorpay Checkout modal mode (when API keys are active)
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setPaymentError(
          'Unable to load Razorpay Checkout popup. Please use the direct Razorpay.me link below.'
        );
        setPaying(false);
        return;
      }

      const rawPhoneDigits = (invoice.customer.phone || '').replace(/[^0-9]/g, '');
      const formattedContact =
        rawPhoneDigits.length >= 10 ? `+91${rawPhoneDigits.slice(-10)}` : invoice.customer.phone;

      const rzp = new window.Razorpay({
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: "AL-HARAM Drycleaner's",
        description: `Invoice #${invoice.invoiceNumber} (${
          effectivePlan === 'half' ? `50% Advance (₹${currentPayable})` : 'Full Payment'
        })`,
        order_id: orderData.orderId,
        prefill: {
          name: invoice.customer.name,
          email: invoice.customer.email || '',
          contact: formattedContact,
        },
        notes: {
          invoiceNumber: invoice.invoiceNumber,
        },
        theme: {
          color: '#0284c7',
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceId: invoice.invoiceNumber,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success && verifyData.invoice) {
              setInvoice(verifyData.invoice);
              setPaymentSuccess(true);
              setRazorpayMeOpened(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setPaymentError(
                verifyData.message || 'Payment verification failed. Please contact support.'
              );
            }
          } catch {
            setPaymentError('Network error while verifying payment.');
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      rzp.on?.('payment.failed', (failureRes) => {
        setPaymentError(
          failureRes?.error?.description || 'Payment was not completed in Razorpay Checkout.'
        );
        setPaying(false);
      });

      rzp.open();
    } catch {
      setPaymentError('Network error while initiating Razorpay payment.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading Official Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Invoice Not Found</h2>
          <p className="text-sm text-slate-600">{error || 'Could not locate this invoice record.'}</p>
          <Link
            href="/track"
            className="inline-block bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
          >
            Back to Tracker
          </Link>
        </div>
      </div>
    );
  }

  const paymentOptions = calculatePaymentOptions(invoice.grandTotal, invoice.paidAmount);
  const { amount: payableAmount, effectivePlan } = resolvePlanPayableAmount(
    invoice.grandTotal,
    invoice.paidAmount,
    paymentPlan
  );
  const directRazorpayMeUrl = buildRazorpayMeUrl(razorpayMeBaseUrl);
  const isCheckoutKeyConfigured =
    serverCheckoutEnabled ||
    Boolean(
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
        !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('placeholder')
    );
  const whatsappConfirmUrl = `https://wa.me/918700548416?text=${encodeURIComponent(
    `Hello AL-HARAM Drycleaner's, I have completed payment of ₹${payableAmount} via Razorpay.me for Invoice #${invoice.invoiceNumber} (${invoice.customer.name}). Please verify and mark my bill Paid.`
  )}`;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappUrl = generateWhatsAppInvoiceUrl({
    customerName: invoice.customer.name,
    customerPhone: invoice.customer.phone,
    invoiceNumber: invoice.invoiceNumber,
    grandTotal: invoice.grandTotal,
    paymentStatus: invoice.paymentStatus,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    items: invoice.items,
    status: invoice.status,
    invoiceUrl: currentUrl,
    razorpayMeUrl: razorpayMeBaseUrl,
  });

  // Extract all inspection photos across items
  const allInspectionPhotos: Array<{ url: string; caption?: string; itemName: string }> = [];
  invoice.items.forEach((item) => {
    if (item.inspectionImages && item.inspectionImages.length > 0) {
      item.inspectionImages.forEach((img) => {
        allInspectionPhotos.push({ ...img, itemName: item.name });
      });
    }
  });

  const isQuotePending =
    (hasRangePriceItems(invoice.items) || invoice.items.some((it) => it.rate === 0)) &&
    (invoice.grandTotal === 0 || invoice.items.some((it) => it.rate === 0));

  const rangeItemNames = invoice.items
    .filter((it) => isRangePriceItem({ name: it.name }) || it.rate === 0)
    .map((it) => it.name)
    .join(', ');

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 print:bg-white print:p-0 print:m-0">
      <div className="max-w-3xl mx-auto space-y-6 print:max-w-none print:m-0 print:space-y-0">
        {/* Navigation & Action Bar (Hidden when printing) */}
        <div className="no-print print:hidden flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <Link
            href="/track"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tracker
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Share on WhatsApp
            </a>

            <button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {paymentSuccess && (
          <div className="no-print bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">
                {invoice.paymentStatus === 'paid'
                  ? 'Full Payment Settled Successfully!'
                  : `Advance Payment Confirmed (₹${invoice.paidAmount})!`}
              </p>
              <p className="text-xs text-emerald-700">
                {invoice.paymentStatus === 'paid'
                  ? 'Your transaction has been confirmed and your invoice is marked as PAID.'
                  : `Advance received via Razorpay. Remaining balance of ₹${invoice.balanceAmount} is due upon delivery (or payable below anytime).`}
              </p>
            </div>
          </div>
        )}


        {/* Out for Delivery Verification OTP Banner */}
        {invoice.status === 'out_for_delivery' && invoice.deliveryOtp && (
          <div className="no-print bg-gradient-to-r from-indigo-950 via-brand-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-indigo-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                🛵
              </div>
              <div>
                <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                  Out for Doorstep Delivery
                </p>
                <h4 className="text-sm sm:text-base font-extrabold text-white">
                  Delivery Verification OTP
                </h4>
                <p className="text-[11px] text-slate-300">
                  Share this OTP with our delivery boy to confirm receipt of your garments.
                </p>
              </div>
            </div>

            <div className="bg-white/15 border border-white/25 px-4 py-2 rounded-2xl flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
                OTP:
              </span>
              <span className="font-mono font-black text-xl tracking-widest text-white">
                {invoice.deliveryOtp}
              </span>
            </div>
          </div>
        )}

        {/* PRINTABLE OFFICIAL INVOICE CARD */}
        <div className="printable-area bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-10 space-y-8 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none">
          {/* Top Store Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    AL-HARAM
                  </h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Drycleaner&apos;s & Launderettes
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  A-1/67, Birla Farm Colony, Chattarpur, New Delhi-110074
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  +91 87005 48416, +91 88513 07434
                </p>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-left sm:text-right space-y-1">
              <span className="text-xs uppercase font-extrabold px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200 inline-block">
                Tax Invoice / Customer Bill
              </span>
              <p className="text-xl sm:text-2xl font-mono font-black text-slate-900 pt-1">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-slate-500">
                Date: {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs font-semibold text-slate-700 capitalize">
                Status: <span className="text-brand-600 font-bold">{invoice.status.replace('_', ' ')}</span>
              </p>
            </div>
          </div>

          {/* Customer & Order Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div>
              <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Billed To Customer</p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{invoice.customer.name}</p>
              <p className="text-slate-600 mt-0.5">📞 {invoice.customer.phone}</p>
              {invoice.customer.address && (
                <p className="text-slate-600 mt-0.5">📍 {invoice.customer.address}</p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Payment Details</p>
              <p className="text-sm font-bold mt-1">
                Payment Status:{' '}
                <span
                  className={`uppercase font-black px-2 py-0.5 rounded ${
                    isQuotePending
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : invoice.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isQuotePending ? 'Quote Pending' : invoice.paymentStatus}
                </span>
              </p>
              <p className="text-slate-500">Method: {invoice.paymentMethod.toUpperCase()}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4 min-w-[180px]">Garment / Service Description</th>
                  <th className="py-3 px-4 text-center">Service Type</th>
                  <th className="py-3 px-4 text-right min-w-[150px]">Rate</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right min-w-[90px]">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, index) => {
                  const isRange =
                    isRangePriceItem({ name: item.name }) ||
                    (item.notes || '').toLowerCase().includes('owner will connect') ||
                    (item.notes || '').toLowerCase().includes('inspection');
                  const isPendingQuote = isRange && item.rate === 0;

                  return (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="whitespace-nowrap">{item.name}</span>
                          {isPendingQuote && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                              Quote on Inspection
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-slate-500 font-normal italic mt-0.5">{item.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                          {item.serviceType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {isPendingQuote ? (
                          <div className="flex items-center justify-end">
                            <span className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50/90 border border-amber-200/90 px-3 py-1 rounded-full whitespace-nowrap shadow-2xs text-center">
                              <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Owner will connect</span>
                            </span>
                          </div>
                        ) : (
                          `₹${item.rate}`
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {isPendingQuote ? (
                          <div className="flex items-center justify-end">
                            <span className="inline-flex items-center justify-center text-[11px] font-bold text-amber-700 bg-amber-50/80 border border-amber-200/70 px-2.5 py-0.5 rounded-full whitespace-nowrap text-center">
                              Pending
                            </span>
                          </div>
                        ) : (
                          `₹${item.total}`
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasRangePriceItems(invoice.items) && (
            <div className="no-print bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3 text-xs">
              <span className="text-lg">📞</span>
              <div>
                <p className="font-bold text-sm text-amber-950">Specialty Garments Inspection in Progress</p>
                <p className="text-amber-800 mt-0.5">
                  Your order contains specialty items where rates depend on fabric &amp; embroidery. Our store owner will inspect your garments and connect with you to confirm your final quote.
                </p>
              </div>
            </div>
          )}

          {/* Totals & Calculations */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            {/* Terms and notes */}
            <div className="text-[11px] text-slate-500 max-w-sm space-y-1 leading-relaxed">
              <p className="font-bold text-slate-700 uppercase text-[10px]">Terms & Conditions:</p>
              <p>1. Please check garments at delivery time.</p>
              <p>2. Unclaimed clothes are stored for a maximum of 30 days.</p>
              <p>3. Manufacturer defect or fabric age color-bleeding is not covered.</p>
            </div>

            {/* Financial Summary */}
            <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{invoice.subtotal}</span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>
                    Discount ({invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'Flat'}):
                  </span>
                  <span>- ₹{invoice.discountAmount}</span>
                </div>
              )}

              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span>₹{invoice.taxAmount}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="font-extrabold text-slate-900 text-sm">Grand Total:</span>
                <span className="font-extrabold text-xl text-brand-700">
                  {isQuotePending && invoice.grandTotal === 0
                    ? 'Quote on Inspection'
                    : `₹${invoice.grandTotal}/-`}
                </span>
              </div>

              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium pt-1">
                  <span>Amount Paid:</span>
                  <span>₹{invoice.paidAmount}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-slate-200 font-bold">
                <span className="text-slate-800">Balance Due:</span>
                <span
                  className={
                    invoice.balanceAmount > 0
                      ? 'text-amber-600 text-sm'
                      : isQuotePending && invoice.grandTotal === 0
                      ? 'text-amber-700 text-xs font-semibold'
                      : 'text-emerald-600'
                  }
                >
                  {isQuotePending && invoice.grandTotal === 0
                    ? 'Pending Owner Quote'
                    : `₹${invoice.balanceAmount}`}
                </span>
              </div>
            </div>
          </div>

          {/* Garment Inspection Photos (Cloudinary) */}
          {allInspectionPhotos.length > 0 && (
            <div className="pt-6 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Garment Pre-Inspection Damage & Stain Tags ({allInspectionPhotos.length})
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">
                Photos taken upon receiving to document existing tears, missing buttons, or stubborn stains.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {allInspectionPhotos.map((photo, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <div className="relative h-28 w-full bg-slate-200">
                      <Image
                        src={photo.url}
                        alt={`Inspection tag ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-2 text-[10px] text-slate-600">
                      <p className="font-bold truncate">{photo.itemName}</p>
                      {photo.caption && <p className="truncate text-slate-400">{photo.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONLINE RAZORPAY PAYMENT (Hidden when printing) */}
          {isQuotePending ? (
            <div className="no-print bg-amber-50/90 border border-amber-200/90 rounded-2xl p-6 text-center space-y-3.5 shadow-2xs">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Specialty Garment Inspection in Progress
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your order contains specialty garments ({rangeItemNames || 'Range Items'}) where exact pricing is determined upon physical inspection by our master dry cleaner.
                </p>
              </div>
              <div className="bg-white/90 border border-amber-200/80 rounded-xl p-3 max-w-md mx-auto text-xs text-amber-950 font-medium">
                💳 <strong>Online Payment will appear here:</strong> As soon as the store owner confirms your quote with you, the 50% advance and full payment options will be activated on this page.
              </div>
              <div className="pt-1 flex justify-center">
                <a
                  href={`https://wa.me/918700548416?text=${encodeURIComponent(
                    `Hello AL-HARAM Drycleaner's, I am inquiring about the quote for my Invoice #${invoice.invoiceNumber} (${invoice.customer.name}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Discuss Quote with Owner on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : invoice.paymentStatus !== 'paid' && invoice.grandTotal > 0 ? (
            <div className="no-print space-y-3">
              {paymentError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {razorpayMeOpened && payableAmount > 0 && (
                <div className="bg-sky-50 border border-sky-200 text-sky-900 p-4 rounded-2xl space-y-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      {popupBlocked
                        ? 'Click "Open Razorpay.me Page" below to complete payment'
                        : `Razorpay.me Opened — Enter ₹${payableAmount}`}
                    </p>
                    <p className="text-sky-800 leading-relaxed">
                      On Razorpay.me, enter the exact amount and put your Invoice number in the required{' '}
                      <span className="font-bold">Comment</span> field, then pay via UPI, Card, or Net Banking:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-sky-700">1. Amount to Enter</p>
                        <p className="font-mono font-black text-sm text-slate-900">₹{payableAmount}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('amount', String(payableAmount))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-[11px] transition cursor-pointer"
                      >
                        {copiedField === 'amount' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'amount' ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-sky-700">2. Comment Field</p>
                        <p className="font-mono font-black text-xs text-slate-900">Invoice #{invoice.invoiceNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('ref', `Invoice #${invoice.invoiceNumber}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-[11px] transition cursor-pointer"
                      >
                        {copiedField === 'ref' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'ref' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <a
                      href={razorpayMeOpened}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-2 rounded-lg transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {popupBlocked ? 'Open Razorpay.me Page' : 'Reopen Razorpay.me Page'}
                    </a>
                    <a
                      href={whatsappConfirmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Send Payment ID / Screenshot on WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => fetchInvoice(true)}
                      disabled={refreshingStatus}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 font-bold px-3.5 py-2 rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
                      {refreshingStatus ? 'Checking...' : 'Refresh Payment Status'}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950 text-white p-6 rounded-2xl space-y-5 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <span className="font-extrabold text-base">
                        {paymentOptions.canChooseHalf ? 'Payment Options' : 'Balance Payment'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {paymentOptions.canChooseHalf
                        ? 'Pay 50% advance now (mandatory minimum) or settle the full bill online via Razorpay / UPI.'
                        : `Advance payment of ₹${paymentOptions.alreadyPaid} already received. Settle the remaining balance online.`}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-300 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                    Due: ₹{paymentOptions.remaining}
                  </span>
                </div>

                {paymentOptions.canChooseHalf ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('half')}
                      className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                        paymentPlan === 'half'
                          ? 'bg-amber-400/15 border-amber-400 ring-2 ring-amber-400/40'
                          : 'bg-white/5 border-white/15 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                          Option 1 • 50% Advance (Mandatory)
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            paymentPlan === 'half'
                              ? 'border-amber-400 bg-amber-400'
                              : 'border-slate-400'
                          }`}
                        >
                          {paymentPlan === 'half' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                          )}
                        </span>
                      </div>
                      <p className="text-base font-black text-white mt-1">
                        50% Advance — ₹{paymentOptions.halfPayableAmount}
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Pay 50% advance now • Remaining ₹{paymentOptions.remainingAfterHalf} on delivery
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentPlan('full')}
                      className={`text-left p-4 rounded-xl border transition cursor-pointer ${
                        paymentPlan === 'full'
                          ? 'bg-emerald-400/15 border-emerald-400 ring-2 ring-emerald-400/40'
                          : 'bg-white/5 border-white/15 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                          Option 2 • Full Payment
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            paymentPlan === 'full'
                              ? 'border-emerald-400 bg-emerald-400'
                              : 'border-slate-400'
                          }`}
                        >
                          {paymentPlan === 'full' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                          )}
                        </span>
                      </div>
                      <p className="text-base font-black text-white mt-1">
                        Full Payment — ₹{paymentOptions.remaining}
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        100% settled now • Zero balance remaining on delivery
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-emerald-400/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                        Remaining Balance Payment
                      </span>
                      <p className="text-base font-black text-white mt-0.5">
                        Settle Final Balance — ₹{paymentOptions.remaining}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        50% Advance of ₹{paymentOptions.alreadyPaid} has already been received.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                      Final Settlement
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
                  <p className="text-xs text-slate-300 text-center sm:text-left">
                    Paying now:{' '}
                    <span className="font-black text-white">₹{payableAmount}</span>{' '}
                    ({effectivePlan === 'half' ? '50% Advance' : 'Full Balance'}) • Ref:{' '}
                    <span className="font-mono font-bold text-amber-300">{invoice.invoiceNumber}</span>
                  </p>

                  <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      onClick={handleRazorpayPayment}
                      disabled={paying}
                      className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3 px-5 rounded-xl transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      {paying ? 'Processing...' : `Pay ₹${payableAmount} via Razorpay`}
                    </button>
                    {!isCheckoutKeyConfigured && (
                      <a
                        href={directRazorpayMeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setPopupBlocked(false);
                          setRazorpayMeOpened(directRazorpayMeUrl);
                        }}
                        className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/25 font-bold py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                        Razorpay.me
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

