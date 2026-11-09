'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  FileText,
  AlertCircle,
  Truck,
  Shirt,
} from 'lucide-react';

interface OrderData {
  _id: string;
  invoiceNumber: string;
  customer: { name: string; phone: string; address?: string };
  status: 'received' | 'in_process' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: Array<{ name: string; serviceType: string; quantity: number; total: number; inspectionImages?: Array<{ url: string; caption?: string }> }>;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  createdAt: string;
  pickupDate?: string;
  deliveryDueDate?: string;
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const [search, setSearch] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [searchedOrders, setSearchedOrders] = useState<OrderData[]>([]);
  const [error, setError] = useState('');

  const handleSearch = async (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : search).trim();
    if (!q) return;

    setLoading(true);
    setError('');
    setOrder(null);
    setSearchedOrders([]);

    try {
      // First try fetching single invoice
      const res = await fetch(`/api/orders/${q}`);
      const data = await res.json();

      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        // Fallback: search by phone number or name
        const searchRes = await fetch(`/api/orders?search=${encodeURIComponent(q)}&limit=10`);
        const searchData = await searchRes.json();

        if (searchData.success && searchData.orders && searchData.orders.length > 0) {
          if (searchData.orders.length === 1) {
            setOrder(searchData.orders[0]);
          } else {
            setSearchedOrders(searchData.orders);
          }
        } else {
          setError(`No orders found matching "${q}". Please check your Invoice Number or Mobile Number.`);
        }
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const stages = [
    { key: 'received', label: 'Received & Inspected', desc: 'Clothes logged into system' },
    { key: 'in_process', label: 'Dry Cleaning & Pressing', desc: 'Stain treatment & steam press' },
    { key: 'ready', label: 'Ready for Collection', desc: 'Packaged & quality checked' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider on the way' },
    { key: 'delivered', label: 'Delivered / Completed', desc: 'Delivered to customer' },
  ];

  const getStageIndex = (status: string) => {
    return stages.findIndex((s) => s.key === status);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <span className="text-xs font-bold tracking-widest text-brand-600 uppercase bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          Live Status & Invoice Lookup
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
          Track Your Clothes
        </h1>
        <p className="text-slate-600 text-sm mt-2 max-w-lg mx-auto">
          Enter your Invoice Number (e.g. <span className="font-mono font-bold text-slate-800">AHDC-2026-0001</span>) or 10-digit mobile number to check real-time progress.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
        >
          <div className="relative grow">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Invoice # or Mobile No."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Searching...' : 'Track Now'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 text-sm mb-8">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Multiple orders found under phone */}
      {searchedOrders.length > 0 && !order && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Found {searchedOrders.length} orders for this number:
          </h3>
          <div className="space-y-2">
            {searchedOrders.map((ord) => (
              <div
                key={ord._id}
                onClick={() => setOrder(ord)}
                className="p-4 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-xl cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">{ord.invoiceNumber}</span>
                  <p className="text-xs text-slate-500">
                    {new Date(ord.createdAt).toLocaleDateString()} • {ord.items.length} garments • ₹{ord.grandTotal}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
                  {ord.status.replace('_', ' ')} &rarr;
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Order Details Card */}
      {order && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-fade-in space-y-6">
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs text-brand-300 font-semibold uppercase tracking-wider">
                Official Invoice
              </span>
              <h2 className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight mt-0.5">
                {order.invoiceNumber}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Customer: <span className="font-bold text-white">{order.customer.name}</span> ({order.customer.phone})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40">
                {order.status.replace('_', ' ')}
              </span>
              <Link
                href={`/invoice/${order.invoiceNumber}`}
                className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                <FileText className="w-3.5 h-3.5" />
                View Full Bill / PDF
              </Link>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="px-6 sm:px-8 py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
              Garment Progress Timeline
            </h3>

            <div className="relative flex flex-col sm:flex-row justify-between gap-6 sm:gap-2">
              {stages.map((stage, idx) => {
                const currentIdx = getStageIndex(order.status);
                const isPassed = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={stage.key} className="flex-1 flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors shadow-xs ${
                        isCurrent
                          ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isPassed ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {stage.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Garments Breakdown */}
          <div className="px-6 sm:px-8 pb-8 pt-2 space-y-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Garments in this Order ({order.items.length})
              </h3>
              <span className="text-xs font-bold text-slate-700">
                Total Bill: <span className="text-base text-brand-700 font-extrabold">₹{order.grandTotal}</span>
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                      <Shirt className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">
                        {item.serviceType.replace('_', ' ')} • Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">₹{item.total}</span>
                </div>
              ))}
            </div>

            {/* Payment badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs space-y-0.5 text-center sm:text-left">
                <p className="font-bold text-slate-800">
                  Payment Status:{' '}
                  <span
                    className={`font-black uppercase ${
                      order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </p>
                {order.balanceAmount > 0 ? (
                  <p className="text-slate-500">Balance Due: ₹{order.balanceAmount}</p>
                ) : (
                  <p className="text-emerald-600">Fully Settled</p>
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/invoice/${order.invoiceNumber}`}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  Pay Online / Download Invoice
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="grow">
        <Suspense fallback={<div className="py-20 text-center text-slate-500">Loading order tracker...</div>}>
          <TrackContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

