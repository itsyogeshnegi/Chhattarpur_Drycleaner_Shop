'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { normalizeIndianPhone, sanitizePhoneInput } from '@/lib/phone';
import { calculatePaymentOptions } from '@/lib/paymentPlan';
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
  Loader2,
  CreditCard,
} from 'lucide-react';

export default function PickupBookingSection() {
  const { customer, openAuthModal } = useCustomerAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    serviceType: "Men's & Women's Dry Cleaning",
    garmentCount: '1 – 5 pieces',
    address: '',
    timeSlot: 'Morning (9:00 AM – 1:00 PM)',
    pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [bookedOrder, setBookedOrder] = useState<{
    invoiceNumber: string;
    customer: { name: string; phone: string; email?: string; address?: string };
    pickupDate?: string;
    grandTotal?: number;
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

    if (loading) return;

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
      // Check if user has items selected in the Rate Calculator estimate
      let orderItems = [
        {
          name: `Doorstep Pickup (${formData.serviceType} - ${formData.garmentCount})`,
          serviceType: 'dry_clean',
          rate: 0,
          quantity: 1,
          notes: `${formData.timeSlot} | Scheduled for ${formData.pickupDate}`,
        },
      ];

      if (typeof window !== 'undefined') {
        try {
          const rawEstimate = localStorage.getItem('alharam_active_estimate');
          if (rawEstimate) {
            const parsed = JSON.parse(rawEstimate);
            if (Array.isArray(parsed) && parsed.length > 0) {
              orderItems = parsed.map((it: { name?: string; serviceType?: string; rate?: number; quantity?: number }) => ({
                name: it.name || 'Garment Item',
                serviceType: it.serviceType || 'dry_clean',
                rate: Number(it.rate) || 0,
                quantity: Number(it.quantity) || 1,
                notes: '',
              }));
            }
          }
        } catch (err) {
          console.error('Error reading active estimate:', err);
        }
      }

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: formData.name.trim(),
            phone: formData.phone.includes('@')
              ? formData.phone.trim()
              : normalizeIndianPhone(formData.phone) || formData.phone.trim(),
            email: customer.email || '',
            address: formData.address.trim(),
          },
          items: orderItems,
          pickupDate: formData.pickupDate,
          internalNotes: `Online request: ${formData.pickupDate} (${formData.timeSlot}) by ${customer.name || customer.userId}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBookedOrder(data.order);
        try {
          localStorage.removeItem('alharam_active_estimate');
        } catch {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('clear-cart'));
        }
      } else {
        setError(data.message || data.error || 'Failed to submit pickup request');
      }
    } catch {
      setError('Connection error. Please try again or message us directly on WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="book-pickup" className="py-16 sm:py-24 bg-white border-t border-slate-100 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading, Subtitle & 3D Product Visual with Plant matching reference image (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-brand-600 inline-block"></span>
                Get a Quote
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                Request a Pickup
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Share your requirements and our team will get back to you with the best price and doorstep collection slot.
              </p>
            </div>

            {/* Visual Box with Plant (styled like the 3D book/box + potted plant in reference) */}
            <div className="relative pt-4">
              <div className="bg-gradient-to-tr from-sky-50 via-slate-50 to-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-center min-h-[280px]">
                {/* 3D Package Mockup */}
                <div className="relative z-10 w-full max-w-xs bg-white rounded-2xl p-5 border border-slate-200/90 shadow-md space-y-3 transform -rotate-1 hover:rotate-0 transition duration-300">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                        AH
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 tracking-tight">
                        Al-Haram Care
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Service:</span>
                      <span className="font-semibold text-slate-800">Italian Steam &amp; DC</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Pickup Area:</span>
                      <span className="font-semibold text-slate-800">Chattarpur, Delhi</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Fabric Check:</span>
                      <span className="font-semibold text-emerald-600">Zero Damage Tag</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Doorstep Collection</span>
                    <span className="font-bold text-brand-600">Free Pickup</span>
                  </div>
                </div>

                {/* Ambient Soft Elements */}
                <div className="absolute top-4 right-4 w-16 h-16 bg-brand-100/60 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 w-20 h-20 bg-sky-100/70 rounded-full blur-2xl pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Form Card matching reference image (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            {bookedOrder ? (
              <div className="text-center py-6 space-y-5 animate-fade-in">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Pickup Scheduled Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Thank you, <span className="font-bold text-slate-900">{bookedOrder.customer.name}</span>. Our collection rider will arrive at your address.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block text-left text-xs space-y-1 min-w-[260px]">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Invoice / Tracking ID</p>
                  <p className="text-lg font-mono font-bold text-brand-600">{bookedOrder.invoiceNumber}</p>
                  <p className="text-[11px] text-slate-600 pt-0.5">📍 {bookedOrder.customer.address}</p>
                  {(bookedOrder.grandTotal ?? 0) > 0 && (() => {
                    const opts = calculatePaymentOptions(bookedOrder.grandTotal || 0, 0);
                    return (
                      <div className="pt-2 mt-2 border-t border-slate-200 space-y-1">
                        <p className="text-[11px] font-bold text-slate-800">
                          Total Estimate: ₹{opts.total}
                        </p>
                        <p className="text-[10px] font-semibold text-amber-700">
                          Mandatory Payment Option: 50% Advance (₹{opts.minHalfAmount}) or Full (₹{opts.total})
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 pt-2">
                  {(bookedOrder.grandTotal ?? 0) > 0 && (
                    <Link
                      href={`/invoice/${bookedOrder.invoiceNumber}`}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Now (50% or Full)</span>
                    </Link>
                  )}

                  <a
                    href={`https://wa.me/918700548416?text=${encodeURIComponent(
                      `Hello Al-Haram Drycleaners! I have booked a pickup for Ref #${bookedOrder.invoiceNumber}. Name: ${bookedOrder.customer.name}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Confirm on WhatsApp</span>
                  </a>

                  <button
                    onClick={() => setBookedOrder(null)}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-5 rounded-lg text-xs transition"
                  >
                    Book Another Order
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {error}
                  </div>
                )}

                {/* Row 1: Your Name & Email/Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email / Mobile *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter 10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cleaned = /[a-zA-Z@]/.test(val) ? val : sanitizePhoneInput(val);
                        setFormData({ ...formData, phone: cleaned });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                    />
                  </div>
                </div>

                {/* Row 2: Service Type & Quantity/Garment Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Product / Service Type *
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                    >
                      <option value="Men's & Women's Dry Cleaning">Men&apos;s &amp; Women&apos;s Dry Cleaning</option>
                      <option value="Suits & Blazers">Suits, Blazers &amp; Sherwanis</option>
                      <option value="Sarees & Bridal Lehengas">Sarees &amp; Bridal Lehengas</option>
                      <option value="Winter Quilts & Blankets">Winter Quilts &amp; Blankets</option>
                      <option value="Everyday Laundry (Per Kg / Pc)">Everyday Laundry (Per Kg / Pc)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Quantity / Garments *
                    </label>
                    <select
                      value={formData.garmentCount}
                      onChange={(e) => setFormData({ ...formData, garmentCount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                    >
                      <option value="1 – 5 pieces">1 – 5 pieces</option>
                      <option value="6 – 10 pieces">6 – 10 pieces</option>
                      <option value="10 – 20 pieces">10 – 20 pieces</option>
                      <option value="20+ pieces (Bulk)">20+ pieces (Bulk)</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Pickup Date & Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.pickupDate}
                      onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Time Slot *
                    </label>
                    <select
                      value={formData.timeSlot}
                      onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                    >
                      <option>Morning (9:00 AM – 1:00 PM)</option>
                      <option>Afternoon (1:00 PM – 5:00 PM)</option>
                      <option>Evening (5:00 PM – 9:00 PM)</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Additional Details / Pickup Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Additional Details / Pickup Address *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tell us your pickup address in Chattarpur / South Delhi, and any specific fabric stains..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition resize-none"
                  ></textarea>
                </div>

                {/* Solid Royal Blue Submit Button matching reference image */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold py-3.5 rounded-lg text-sm shadow-sm transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Request...
                    </span>
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
