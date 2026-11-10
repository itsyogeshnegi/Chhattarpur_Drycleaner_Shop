'use client';

import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Shirt,
  Sparkles,
  LogOut,
  Bed,
  ShieldCheck,
  Truck,
} from 'lucide-react';

interface PopularPriceItem {
  name: string;
  price: number;
  iconName: 'shirt' | 'trouser' | 'coat' | 'saree' | 'bedsheet' | 'blanket';
}

const POPULAR_PRICING: PopularPriceItem[] = [
  { name: 'Shirt / T-Shirt', price: 70, iconName: 'shirt' },
  { name: 'Trouser / Jeans', price: 100, iconName: 'trouser' },
  { name: 'Blazer / Coat', price: 300, iconName: 'coat' },
  { name: 'Saree', price: 250, iconName: 'saree' },
  { name: 'Bedsheet (Double)', price: 150, iconName: 'bedsheet' },
  { name: 'Blanket / Quilt', price: 400, iconName: 'blanket' },
];

export default function PickupBookingSection({
  onViewFullRates,
}: {
  onViewFullRates?: () => void;
}) {
  const { customer, openAuthModal, logout } = useCustomerAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    timeSlot: 'Morning (9:00 AM – 1:00 PM)',
    pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [bookedOrder, setBookedOrder] = useState<{
    invoiceNumber: string;
    customer: { name: string; phone: string; email?: string; address?: string };
    pickupDate?: string;
  } | null>(null);
  const [error, setError] = useState('');

  // Auto-fill customer profile details whenever logged in
  useEffect(() => {
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        name: customer.name || prev.name,
        phone: customer.phone || prev.phone,
      }));
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Requirement: Customer must have an account before booking
    if (!customer) {
      openAuthModal('register');
      return;
    }

    if (!formData.address.trim()) {
      setError('Please provide your pickup address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: customer.email || '',
            address: formData.address.trim(),
          },
          items: [
            {
              name: 'Doorstep Pickup Request',
              serviceType: 'dry_clean',
              rate: 0,
              quantity: 1,
              notes: `${formData.timeSlot} | Scheduled pickup for ${formData.pickupDate}`,
            },
          ],
          pickupDate: formData.pickupDate,
          internalNotes: `Online request: ${formData.pickupDate} (${formData.timeSlot}) by registered customer ${customer.userId}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBookedOrder(data.order);
      } else {
        setError(data.message || data.error || 'Failed to submit pickup request');
      }
    } catch {
      setError('Connection error. Please try again or message us directly on WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (type: PopularPriceItem['iconName']) => {
    switch (type) {
      case 'shirt':
        return <Shirt className="w-4 h-4 text-brand-600" />;
      case 'trouser':
        return (
          <svg className="w-4 h-4 text-brand-600 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M6 3h12l-1 18-4-1-1-9-1 9-4 1z" />
          </svg>
        );
      case 'coat':
        return (
          <svg className="w-4 h-4 text-brand-600 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M4 4h16l-2 16H6z" />
            <path d="m8 4 4 7 4-7" />
          </svg>
        );
      case 'saree':
        return <Sparkles className="w-4 h-4 text-brand-600" />;
      case 'bedsheet':
        return <Bed className="w-4 h-4 text-brand-600" />;
      case 'blanket':
        return (
          <svg className="w-4 h-4 text-brand-600 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3 10h18" />
          </svg>
        );
    }
  };

  return (
    <section id="pricing" className="py-16 sm:py-20 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 2-Column Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Popular Pricing (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Popular Pricing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparent and affordable pricing.
              </p>
            </div>

            {/* Pricing List Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {POPULAR_PRICING.map((item) => (
                <div
                  key={item.name}
                  className="px-4 sm:px-5 py-3 flex items-center justify-between hover:bg-slate-50/70 transition gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 border border-brand-100 flex items-center justify-center shrink-0">
                      {renderIcon(item.iconName)}
                    </div>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      ₹ {item.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Link to Full Price List */}
            <div className="pt-0.5">
              <a
                href="#pricing"
                onClick={(e) => {
                  if (onViewFullRates) {
                    e.preventDefault();
                    onViewFullRates();
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 transition"
              >
                <span>View Full Price List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Column: Book a Pickup Card (5 cols) */}
          <div id="book-pickup" className="lg:col-span-5 scroll-mt-24">
            {bookedOrder ? (
              /* Success State */
              <div className="bg-white border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-lg shadow-emerald-500/10">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">
                    Doorstep Pickup Scheduled!
                  </h3>
                  <p className="text-xs text-slate-600">
                    Thank you, <span className="font-bold">{bookedOrder.customer.name}</span>. Our collection rider has been assigned and will arrive with clean garment hampers.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Tracking Invoice Ref
                    </span>
                    <span className="font-mono font-black text-brand-700 text-sm">
                      {bookedOrder.invoiceNumber}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] flex items-start gap-1 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-words">{bookedOrder.customer.address}</span>
                  </p>
                  <p className="text-slate-600 text-[11px] flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>+91 {bookedOrder.customer.phone}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={`https://wa.me/918700548416?text=${encodeURIComponent(
                      `Hello Al Haram Drycleaners, I scheduled a pickup for Ref #${bookedOrder.invoiceNumber}. Customer: ${bookedOrder.customer.name}. Please confirm collection time.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Confirm on WhatsApp</span>
                  </a>

                  <a
                    href={`/track?query=${bookedOrder.invoiceNumber}`}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <span>Track Order Status Live</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              /* The Clean "Book a Pickup" Card Matching the Reference */
              <div className="bg-sky-50/70 border border-sky-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Book a Pickup
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Schedule a pickup in less than a minute.
                  </p>
                </div>

                {/* Verified Customer Status */}
                {customer && (
                  <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                        ✓
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{customer.name}</p>
                        <p className="text-[10px] text-emerald-700 font-semibold">+91 {customer.phone || customer.userId}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={logout}
                      className="text-[11px] font-bold text-slate-500 hover:text-red-600 flex items-center gap-1"
                      title="Switch account"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Your Full Name *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      WhatsApp Mobile Number *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Pickup Address */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pickup Address in South Delhi *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="House / Flat No., Colony / Apartment, Landmark"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Preferred Date & Time Slot in 2 cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Pickup Date *
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-slate-400 pointer-events-none">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="date"
                          required
                          suppressHydrationWarning
                          value={formData.pickupDate}
                          onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-2xs font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Preferred Slot
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-slate-400 pointer-events-none">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <select
                          value={formData.timeSlot}
                          onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-2xs font-medium"
                        >
                          <option>Morning (9 AM – 1 PM)</option>
                          <option>Afternoon (1 PM – 5 PM)</option>
                          <option>Evening (5 PM – 9 PM)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Pickup CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-xl transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <span>Scheduling Free Pickup...</span>
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>Confirm Free Doorstep Pickup</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-slate-500 leading-tight pt-1">
                    📍 Covering DLF Farms, Chattarpur Enclave, Birla Farm, Mehrauli, Sultanpur, Saket &amp; South Delhi.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
