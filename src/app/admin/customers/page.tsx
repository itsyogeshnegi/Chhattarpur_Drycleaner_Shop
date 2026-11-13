'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  FileText,
  ShoppingBag,
  PlusCircle,
  ExternalLink,
  MapPin,
  Clock,
  IndianRupee,
  UserCheck,
  Calendar,
  ArrowRight,
  X,
  CheckCircle,
  AlertCircle,
  Tag,
  Lock,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  const [authRequired, setAuthRequired] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerRecord | null>(null);
  const [loadingHistoryDetail, setLoadingHistoryDetail] = useState(false);

  // Date-wise Revenue Filter state (start date & end date mandatory; end date >= start date)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  useBodyScrollLock(Boolean(selectedCustomerForHistory));

  const fetchCustomers = async (
    targetPage = page,
    startToUse = appliedStartDate,
    endToUse = appliedEndDate
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(targetPage));
      if (startToUse && endToUse) {
        params.set('startDate', startToUse);
        params.set('endDate', endToUse);
      }

      const res = await fetch(`/api/admin/customers?${params.toString()}`, { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setAuthRequired(false);
        setCustomers(data.customers || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.pagination) setPagination(data.pagination);
        setDateError('');
      } else {
        setDateError(data.message || 'Failed to fetch customers');
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDateFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!startDate.trim() || !endDate.trim()) {
      setDateError('Both Start Date and End Date are mandatory.');
      return;
    }

    if (endDate.trim() < startDate.trim()) {
      setDateError('End Date cannot be smaller than Start Date.');
      return;
    }

    setDateError('');
    setAppliedStartDate(startDate.trim());
    setAppliedEndDate(endDate.trim());
    setPage(1);
    fetchCustomers(1, startDate.trim(), endDate.trim());
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setDateError('');
    setPage(1);
    fetchCustomers(1, '', '');
  };

  const openCustomerHistoryModal = async (cust: CustomerRecord) => {
    setSelectedCustomerForHistory(cust);
    if (cust.totalOrders <= cust.orders.length && !appliedStartDate && !appliedEndDate) return;

    setLoadingHistoryDetail(true);
    try {
      const params = new URLSearchParams({ phone: cust.phone });
      if (appliedStartDate && appliedEndDate) {
        params.set('startDate', appliedStartDate);
        params.set('endDate', appliedEndDate);
      }
      const res = await fetch(
        `/api/admin/customers?${params.toString()}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (data.success && data.customer) {
        setSelectedCustomerForHistory(data.customer);
      }
    } catch (err) {
      console.error('Failed to load full customer history:', err);
    } finally {
      setLoadingHistoryDetail(false);
    }
  };

  useEffect(() => {
    fetchCustomers(page, appliedStartDate, appliedEndDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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

  if (authRequired) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Staff Access Required</h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Please sign in with Store Staff or Admin credentials to access the Customer CRM directory.
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
            View customer details, lifetime spending history, and execute quick actions (Invoices, New Order).
          </p>
        </div>

        <button
          onClick={() => fetchCustomers(page)}
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
          <p className="text-[11px] text-slate-400 mt-0.5">
            {appliedStartDate && appliedEndDate ? 'Active clients in selected period' : 'Profiles recorded in database'}
          </p>
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
          <p className="text-[11px] text-slate-400 mt-0.5">
            {appliedStartDate && appliedEndDate ? 'Bookings in selected period' : 'Combined customer bookings'}
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-xs transition ${
            appliedStartDate && appliedEndDate
              ? 'bg-gradient-to-br from-indigo-50/90 to-brand-50/60 border-indigo-300 ring-2 ring-indigo-200/70'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Total Revenue</span>
              {appliedStartDate && appliedEndDate && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">
                  Filtered
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {appliedStartDate && appliedEndDate
              ? `${new Date(appliedStartDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })} – ${new Date(appliedEndDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}`
              : 'Lifetime customer billing'}
          </p>
        </div>
      </div>

      {/* Date-wise Revenue & Activity Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Header line with title and active badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-sm">
                  Date-wise Revenue Filter
                </span>
                {appliedStartDate && appliedEndDate && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Filter
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Filter customer bookings and calculate exact billing revenue between start and end dates
              </p>
            </div>
          </div>

          {appliedStartDate && appliedEndDate && (
            <div className="inline-flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3 py-1 rounded-xl">
              <span>Period Revenue:</span>
              <strong className="font-extrabold">₹{metrics.totalRevenue.toLocaleString('en-IN')}</strong>
              <span className="text-slate-400">({metrics.totalOrders} {metrics.totalOrders === 1 ? 'order' : 'orders'})</span>
            </div>
          )}
        </div>

        {/* Input Controls Container - Spacious, perfectly aligned, zero text overlap */}
        <form
          onSubmit={handleApplyDateFilter}
          className="bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap"
        >
          {/* Start Date */}
          <div className="flex-1 min-w-[150px] max-w-full sm:max-w-[200px]">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (dateError) setDateError('');
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer shadow-2xs h-[38px]"
            />
          </div>

          {/* Arrow separator */}
          <div className="hidden sm:flex items-center justify-center pb-2.5 text-slate-400 shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* End Date */}
          <div className="flex-1 min-w-[150px] max-w-full sm:max-w-[200px]">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              min={startDate || undefined}
              value={endDate}
              onChange={(e) => {
                const val = e.target.value;
                setEndDate(val);
                if (startDate && val && val < startDate) {
                  setDateError('End Date cannot be smaller than Start Date.');
                } else if (dateError) {
                  setDateError('');
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer shadow-2xs h-[38px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-xs px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer h-[38px] shrink-0"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Check Revenue</span>
            </button>

            {(appliedStartDate || appliedEndDate || startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer h-[38px] shadow-2xs shrink-0"
                title="Reset date filter and view lifetime stats"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </form>

        {/* Validation Error or Active Filter Range Confirmation */}
        {dateError ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{dateError}</span>
          </div>
        ) : appliedStartDate && appliedEndDate ? (
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Showing customer orders &amp; revenue from{' '}
                <strong className="text-slate-800 font-bold">
                  {new Date(appliedStartDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800 font-bold">
                  {new Date(appliedEndDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </span>
            </div>
          </div>
        ) : null}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (page === 1) fetchCustomers(1);
                else setPage(1);
              }
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-brand-500 focus:outline-hidden"
          />
        </div>
        <button
          onClick={() => {
            if (page === 1) fetchCustomers(1);
            else setPage(1);
          }}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
        >
          Search
        </button>
      </div>

      {/* Customers List Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Mobile / Tablet Card View (< lg) */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center gap-2 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
                <span>Loading customers directory...</span>
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              No customers found matching &ldquo;{search}&rdquo;.
            </div>
          ) : (
            customers.map((cust) => (
              <div key={cust.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-100 text-brand-700 font-extrabold flex items-center justify-center text-xs border border-brand-200/60 shrink-0">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate" title={cust.name}>
                        {cust.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {cust.isRegistered ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                            Registered
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                            Walk-in
                          </span>
                        )}
                        {cust.totalOrders >= 2 && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md">
                            Repeat
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-sm text-slate-900">
                      ₹{cust.totalSpent.toLocaleString('en-IN')}
                    </span>
                    <div className="mt-0.5">
                      {cust.totalBalance > 0 ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-full inline-block">
                          Due: ₹{cust.totalBalance.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full inline-block">
                          ✓ Fully Paid
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-slate-100 text-slate-600">
                  <a
                    href={`tel:${cust.phone}`}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 hover:text-brand-600 self-start"
                  >
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </a>
                  {cust.address && (
                    <div className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="break-words whitespace-normal">{cust.address}</span>
                    </div>
                  )}
                </div>

                {cust.lastThreeOrders.length > 0 && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/admin/invoices/${cust.lastThreeOrders[0].invoiceNumber}`}
                          className="font-mono font-bold text-xs text-brand-600 hover:underline"
                        >
                          {cust.lastThreeOrders[0].invoiceNumber}
                        </Link>
                        {getStatusBadge(cust.lastThreeOrders[0].status)}
                      </div>
                      {cust.lastThreeOrders[0].itemsSummary && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {cust.lastThreeOrders[0].itemsSummary}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {new Date(cust.lastThreeOrders[0].createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openCustomerHistoryModal(cust)}
                    className="flex-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/80 px-3 py-2 rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    <span>Invoices ({cust.totalOrders})</span>
                  </button>
                  <Link
                    href={cust.actions.posNewOrderUrl}
                    className="flex-1 bg-slate-900 hover:bg-brand-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition inline-flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Order</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clean Desktop Table (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="py-3.5 px-4 w-[220px]">Customer</th>
                <th className="py-3.5 px-4 w-[250px] max-w-[250px]">Contact &amp; Address</th>
                <th className="py-3.5 px-4 w-[150px] text-center">Orders &amp; Spend</th>
                <th className="py-3.5 px-4">Latest Activity</th>
                <th className="py-3.5 px-4 w-[220px] text-right">Quick Actions</th>
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
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer Name & Profile */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-100 text-brand-700 font-extrabold flex items-center justify-center text-sm border border-brand-200/60 shadow-2xs shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm leading-snug truncate" title={cust.name}>
                            {cust.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {cust.isRegistered ? (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                                Registered
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                                Walk-in
                              </span>
                            )}
                            {cust.totalOrders >= 2 && (
                              <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md">
                                Repeat
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact & Address */}
                    <td className="py-3.5 px-4 align-top w-[250px] max-w-[250px]">
                      <div className="space-y-1.5">
                        <div>
                          <a
                            href={`tel:${cust.phone}`}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 hover:text-brand-600 transition bg-slate-50 hover:bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md"
                            title="Call Customer"
                          >
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cust.phone}</span>
                          </a>
                        </div>
                        {cust.address ? (
                          <div className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="break-words whitespace-normal font-normal">
                              {cust.address}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No address recorded</p>
                        )}
                      </div>
                    </td>

                    {/* Orders & Total Spend */}
                    <td className="py-3.5 px-4 align-top text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                          ₹{cust.totalSpent.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {cust.totalOrders} {cust.totalOrders === 1 ? 'Order' : 'Orders'}
                        </span>
                        {cust.totalBalance > 0 ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                            Due: ₹{cust.totalBalance.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full whitespace-nowrap">
                            ✓ Fully Paid
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Activity / Order */}
                    <td className="py-3.5 px-4 align-top">
                      {cust.lastThreeOrders.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/admin/invoices/${cust.lastThreeOrders[0].invoiceNumber}`}
                              className="font-mono font-bold text-xs text-brand-600 hover:text-brand-800 hover:underline"
                            >
                              {cust.lastThreeOrders[0].invoiceNumber}
                            </Link>
                            {getStatusBadge(cust.lastThreeOrders[0].status)}
                          </div>
                          {cust.lastThreeOrders[0].itemsSummary && (
                            <p className="text-[11px] text-slate-500 truncate max-w-[210px]" title={cust.lastThreeOrders[0].itemsSummary}>
                              {cust.lastThreeOrders[0].itemsSummary}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(cust.lastThreeOrders[0].createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No orders yet</span>
                      )}
                    </td>

                    {/* QUICK ACTIONS */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                        {/* Action 1: View Orders & Invoices History */}
                        <button
                          type="button"
                          onClick={() => openCustomerHistoryModal(cust)}
                          className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/80 px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                          title="View Past Orders & Invoices History"
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-600" />
                          <span>Invoices ({cust.totalOrders})</span>
                        </button>

                        {/* Action 2: New Order (POS) */}
                        <Link
                          href={cust.actions.posNewOrderUrl}
                          className="bg-slate-900 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
                          title="Create New Order in Counter POS"
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

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} customers)
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

      {/* Customer Orders History Modal (Action 2 Detail View) */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 overflow-hidden overscroll-none bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
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
            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 grow">
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Complete Order History ({selectedCustomerForHistory.totalOrders})
                  </h4>
                  {loadingHistoryDetail && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading full history...
                    </span>
                  )}
                </div>

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
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-end">
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

