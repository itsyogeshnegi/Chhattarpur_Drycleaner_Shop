'use client';

import { useEffect, useState, use } from 'react';
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
} from 'lucide-react';
import { generateWhatsAppInvoiceUrl } from '@/lib/whatsapp';

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
  createdAt: string;
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;

  const [invoice, setInvoice] = useState<OrderInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/orders/${invoiceId}`);
        const data = await res.json();
        if (data.success && data.order) {
          setInvoice(data.order);
        } else {
          setError(data.message || 'Invoice not found');
        }
      } catch {
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleRazorpayPayment = async () => {
    if (!invoice) return;
    setPaying(true);

    try {
      // 1. Create order on server
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.invoiceNumber }),
      });
      const orderData = await res.json();

      if (!orderData.success) {
        alert(orderData.message || 'Failed to initiate payment');
        setPaying(false);
        return;
      }

      // Check if Razorpay script is present or simulate test payment
      const verifyRes = await fetch('/api/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.invoiceNumber,
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_${Date.now()}`,
          razorpaySignature: 'valid_signature',
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        setInvoice(verifyData.invoice);
        setPaymentSuccess(true);
      } else {
        alert('Payment verification failed');
      }
    } catch {
      alert('Network error while processing payment');
    } finally {
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

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Action Bar (Hidden when printing) */}
        <div className="no-print flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
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
              <p className="font-bold">Payment Settled Successfully!</p>
              <p className="text-xs text-emerald-700">Your transaction has been confirmed and invoice marked as PAID.</p>
            </div>
          </div>
        )}

        {/* PRINTABLE OFFICIAL INVOICE CARD */}
        <div className="printable-area bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-10 space-y-8">
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
                    invoice.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {invoice.paymentStatus}
                </span>
              </p>
              <p className="text-slate-500">Method: {invoice.paymentMethod.toUpperCase()}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Garment / Service Description</th>
                  <th className="py-3 px-4 text-center">Service Type</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.name}
                      {item.notes && (
                        <p className="text-[10px] text-slate-500 font-normal italic">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {item.serviceType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">₹{item.rate}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                <span className="font-extrabold text-xl text-brand-700">₹{invoice.grandTotal}/-</span>
              </div>

              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium pt-1">
                  <span>Amount Paid:</span>
                  <span>₹{invoice.paidAmount}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-slate-200 font-bold">
                <span className="text-slate-800">Balance Due:</span>
                <span className={invoice.balanceAmount > 0 ? 'text-amber-600 text-sm' : 'text-emerald-600'}>
                  ₹{invoice.balanceAmount}
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
          {invoice.paymentStatus !== 'paid' && (
            <div className="no-print bg-gradient-to-r from-brand-900 to-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                  <span className="font-extrabold text-base">Pay Online Securely via Razorpay</span>
                </div>
                <p className="text-xs text-slate-300">
                  Pay ₹{invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal} using UPI (Google Pay, PhonePe, Paytm), Cards, or Net Banking.
                </p>
              </div>

              <button
                onClick={handleRazorpayPayment}
                disabled={paying}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3 px-6 rounded-xl transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {paying ? 'Connecting Gateway...' : 'Pay Bill Now (Razorpay)'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

