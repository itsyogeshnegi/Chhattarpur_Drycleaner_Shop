'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import {
  User,
  Package,
  Calendar,
  ExternalLink,
  LogOut,
  X,
  Phone,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Search,
  Lock,
} from 'lucide-react';

interface OrderHistoryItem {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  status: string;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  items: Array<{ name: string; serviceType: string; quantity: number; total?: number }>;
  pickupDate?: string;
  deliveryOtp?: string;
  deliveryVerifiedBy?: string;
  deliveredAt?: string;
}

export default function CustomerHistoryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { customer, logout, openAuthModal } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const [searchPhone, setSearchPhone] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOrders = useCallback(async (phoneToSearch?: string) => {
    const targetPhone = phoneToSearch || (customer ? customer.phone || customer.userId : '');
    if (!targetPhone) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/customer/orders?phone=${encodeURIComponent(targetPhone)}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
        setHasSearched(true);
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        fetchOrders();
      } else if (searchPhone.trim().length >= 10) {
        fetchOrders(searchPhone.trim());
      }
    }
  }, [isOpen, customer, fetchOrders, searchPhone]);

  if (!isOpen || !mounted) return null;

  const handlePhoneSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    fetchOrders(searchPhone.trim());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✅ Ready for Collection
          </span>
        );
      case 'in_process':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🧼 In Cleaning / Press
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🛵 Out for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🎉 Delivered
          </span>
        );
      default:
        return (
          <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            📥 Received
          </span>
        );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 md:p-6 transition-opacity animate-in fade-in duration-200 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-600 to-sky-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-lg text-white border border-white/30 shrink-0">
              {customer ? (customer.name ? customer.name.charAt(0).toUpperCase() : 'C') : <User className="w-5 h-5 text-white" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base truncate">
                  {customer ? customer.name : 'Customer Portal & History'}
                </h3>
                {customer && (
                  <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 shrink-0">
                    Customer
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-100 truncate flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-brand-200" />
                <span>
                  {customer ? `+91 ${customer.phone || customer.userId}` : 'Track pickups, view bills & reorder'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Profile"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-100 px-4 bg-slate-50/70 text-xs font-bold text-slate-600 shrink-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'orders'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order History</span>
            <span className="ml-1 bg-brand-100 text-brand-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {orders.length}
            </span>
          </button>

          {customer && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'profile'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile Details</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto grow space-y-3.5">
          {/* Quick Mobile Search Banner when not logged in */}
          {!customer && (
            <div className="bg-sky-50/80 border border-brand-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-brand-600" />
                  <span>Find Orders by Mobile Number</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal('login');
                  }}
                  className="text-[11px] font-bold text-brand-700 hover:text-brand-900 hover:underline flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Sign In / Join →</span>
                </button>
              </div>

              <form onSubmit={handlePhoneSearchSubmit} className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Enter 10-digit WhatsApp / phone number..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={loading || !searchPhone.trim()}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'orders' ? (
            <>
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Past Bookings &amp; Invoices
                </span>
                <button
                  onClick={() => fetchOrders(searchPhone.trim())}
                  disabled={loading}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-500" />
                  <p>Loading your order history...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-3">
                  <div className="w-12 h-12 bg-sky-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {hasSearched ? 'No Orders Found for this Phone' : 'No Orders Found'}
                    </h4>
                    <p className="text-slate-400 mt-1 max-w-xs mx-auto text-[11px]">
                      {hasSearched
                        ? 'We could not find any active or past orders for the provided mobile number. Please check the digits or schedule a new pickup!'
                        : 'You haven\'t placed any bookings yet. Schedule your first free doorstep pickup today!'}
                    </p>
                  </div>
                  <a
                    href="#book-pickup"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
                  >
                    <span>Book a Pickup Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const totalPieces = order.items.reduce(
                      (acc, i) => acc + (i.quantity || 1),
                      0
                    );

                    return (
                      <div
                        key={order._id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-brand-300 transition space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="font-mono font-black text-xs sm:text-sm text-brand-700 block">
                              {order.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="text-right">{getStatusBadge(order.status)}</div>
                        </div>

                        {/* Garments summary */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {totalPieces} {totalPieces === 1 ? 'Garment' : 'Garments'}
                            </span>
                            <span className="font-extrabold text-slate-900">
                              ₹{order.grandTotal}/-
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1 pt-1">
                            {order.items.slice(0, 4).map((item, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                              >
                                {item.quantity}× {item.name}
                              </span>
                            ))}
                            {order.items.length > 4 && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                +{order.items.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Customer Out-for-Delivery OTP */}
                        {order.status === 'out_for_delivery' && order.deliveryOtp && (
                          <div className="bg-indigo-50 border border-indigo-200/90 rounded-xl p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🛵</span>
                              <div>
                                <p className="font-extrabold text-indigo-950 text-[11px]">Delivery Verification OTP</p>
                                <p className="text-[10px] text-indigo-600">Share with rider on handover</p>
                              </div>
                            </div>
                            <span className="font-mono font-black text-sm bg-white text-indigo-900 border border-indigo-300 px-2.5 py-0.5 rounded-lg shadow-2xs tracking-widest">
                              {order.deliveryOtp}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {order.balanceAmount > 0 ? (
                              <span className="text-amber-700 font-bold">
                                Bal Due: ₹{order.balanceAmount}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold">✓ Settled</span>
                            )}
                          </span>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/invoice/${order.invoiceNumber}`}
                              target="_blank"
                              className="text-[11px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 hover:underline"
                            >
                              <span>View Bill</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>

                            <Link
                              href={`/track?query=${order.invoiceNumber}`}
                              onClick={onClose}
                              className="text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                            >
                              <span>Track Live</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Profile Details Tab */
            customer && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Contact Information
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Full Name</span>
                      <span className="font-bold text-slate-900">{customer.name}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Mobile / WhatsApp</span>
                      <span className="font-mono font-bold text-slate-900">
                        +91 {customer.phone || customer.userId}
                      </span>
                    </div>

                    {customer.email && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500 font-medium">Email Address</span>
                        <span className="font-bold text-slate-900">{customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-xl text-[11px] text-brand-900 space-y-1">
                  <p className="font-bold">✨ Fast &amp; Easy Re-ordering</p>
                  <p className="text-brand-700">
                    Your address and contact details are automatically saved for one-click doorstep collections.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      onClose();
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Account</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
