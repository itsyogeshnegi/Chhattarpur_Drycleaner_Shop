'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Printer,
  ArrowLeft,
  FileText,
  ShieldCheck,
  CheckCircle,
  Tag,
  Camera,
} from 'lucide-react';

interface OrderInvoiceRecord {
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
  createdBy: string;
  createdAt: string;
}

export default function DualInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [invoice, setInvoice] = useState<OrderInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeInvoiceType, setActiveInvoiceType] = useState<'customer' | 'internal'>('customer');

  useEffect(() => {
    async function loadInvoice() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (data.success && data.order) {
          setInvoice(data.order);
        }
      } catch (err) {
        console.error('Failed to load invoice:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading invoice data...</div>;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-slate-700">Invoice not found</p>
        <Link href="/admin/orders" className="text-xs text-brand-600 hover:underline">
          &larr; Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:max-w-none print:m-0 print:space-y-0 print:w-full">
      {/* Top Toolbar (Hidden on print) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <Link
          href="/admin/orders"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>

        {/* Dual Invoice Mode Toggle (Requirement 6) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveInvoiceType('customer')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              activeInvoiceType === 'customer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Invoice
          </button>
          <button
            onClick={() => setActiveInvoiceType('internal')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              activeInvoiceType === 'internal'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Internal Accounting Invoice
          </button>
        </div>

        {/* Printing */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Slip
          </button>
        </div>
      </div>

      {/* INVOICE DISPLAY CANVAS */}
      <div
        className={`printable-area bg-white rounded-3xl border p-8 sm:p-10 shadow-sm space-y-6 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none ${
          activeInvoiceType === 'internal'
            ? 'border-amber-400 ring-2 ring-amber-300/40'
            : 'border-slate-200'
        }`}
      >
        {/* Banner if in internal mode */}
        {activeInvoiceType === 'internal' && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl flex items-center justify-between font-black text-xs uppercase tracking-wider">
            <span>*** INTERNAL ACCOUNTING & FACTORY COPY (STORE RECORDS) ***</span>
            <span>RACK: {invoice.rackLocation || 'UNASSIGNED'}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-700" />
              <h2 className="text-xl font-black text-slate-900">AL-HARAM DRYCLEANER&apos;S</h2>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">
              A-1/67, Birla Farm Colony, Chattarpur, New Delhi-110074
            </p>
            <p className="text-[10px] text-slate-500">Ph: +91 87005 48416, +91 88513 07434</p>
          </div>

          <div className="text-right">
            <span
              className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                activeInvoiceType === 'internal'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-brand-50 text-brand-700 border border-brand-200'
              }`}
            >
              {activeInvoiceType === 'internal' ? 'Internal Record' : 'Customer Copy'}
            </span>
            <p className="font-mono font-black text-lg text-slate-900 pt-1">{invoice.invoiceNumber}</p>
            <p className="text-[10px] text-slate-400">
              Date: {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Customer & Staff Meta */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
          <div>
            <p className="font-bold text-slate-400 uppercase text-[9px]">Customer Name</p>
            <p className="font-black text-slate-900 text-sm mt-0.5">{invoice.customer.name}</p>
            <p className="text-slate-600 font-mono">{invoice.customer.phone}</p>
            {invoice.customer.address && <p className="text-slate-500">{invoice.customer.address}</p>}
          </div>

          <div className="text-right space-y-1">
            <p className="font-bold text-slate-400 uppercase text-[9px]">Billing & Staff</p>
            <p className="text-slate-700">Operator: <span className="font-bold">{invoice.createdBy}</span></p>
            <p className="text-slate-700">Payment: <span className="font-bold uppercase">{invoice.paymentStatus}</span></p>
            {activeInvoiceType === 'internal' && (
              <p className="text-amber-800 font-bold">
                Rack Slot: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">{invoice.rackLocation || 'Not Tagged'}</span>
              </p>
            )}
          </div>
        </div>

        {/* Table of Items */}
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 uppercase text-[10px] font-bold text-slate-400">
            <tr>
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Service</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2.5 font-bold text-slate-800">
                  {item.name}
                  {item.notes && <p className="text-[10px] text-slate-400 italic">{item.notes}</p>}
                </td>
                <td className="py-2.5 text-center uppercase text-[10px] font-semibold text-slate-500">
                  {item.serviceType.replace('_', ' ')}
                </td>
                <td className="py-2.5 text-right font-medium">₹{item.rate}</td>
                <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                <td className="py-2.5 text-right font-extrabold">₹{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Internal Notes / Staff Directives (Visible on internal copy) */}
        {activeInvoiceType === 'internal' && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs space-y-1 text-amber-900">
            <p className="font-bold uppercase text-[10px]">Internal Staff Notes & Special Fabric Handling:</p>
            <p>{invoice.internalNotes || 'No special internal directives specified for this batch.'}</p>
          </div>
        )}

        {/* Financials & Balance */}
        <div className="flex justify-between items-baseline pt-4 border-t border-slate-200 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Payment Method</p>
            <p className="font-bold text-slate-700 capitalize">{invoice.paymentMethod}</p>
          </div>

          <div className="text-right space-y-1">
            <p className="text-slate-500">Subtotal: ₹{invoice.subtotal}</p>
            {invoice.discountAmount > 0 && (
              <p className="text-emerald-700 font-bold">Discount: - ₹{invoice.discountAmount}</p>
            )}
            <p className="text-base font-black text-slate-900">
              Net Total: ₹{invoice.grandTotal}/-
            </p>
            <p className="text-[11px] font-bold text-slate-600">
              Paid: ₹{invoice.paidAmount} | Balance: <span className="text-amber-600">₹{invoice.balanceAmount}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

