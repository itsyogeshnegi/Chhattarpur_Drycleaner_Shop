'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, Phone, User, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';

export default function PickupBookingSection() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timeSlot: 'Morning (9:00 AM - 1:00 PM)',
    estimatedGarments: '1-5 pieces',
    specialNotes: '',
  });

  const [loading, setLoading] = useState(false);
  const [bookedOrder, setBookedOrder] = useState<{
    invoiceNumber: string;
    customer: { name: string; phone: string; address?: string };
    pickupDate?: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
          },
          items: [
            {
              name: `Doorstep Pickup (${formData.estimatedGarments})`,
              serviceType: 'dry_clean',
              rate: 0,
              quantity: 1,
              notes: `${formData.timeSlot} | ${formData.specialNotes || 'Standard care'}`,
            },
          ],
          pickupDate: formData.pickupDate,
          internalNotes: `Online request: ${formData.pickupDate} (${formData.timeSlot})`,
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

  return (
    <section id="pickup-booking" className="py-24 bg-white border-t border-neutral-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.25em] font-semibold text-neutral-400 mb-2">
            Complimentary Doorstep Service
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal text-neutral-950 tracking-tight">
            Schedule a Pickup
          </h2>
          <p className="text-sm text-neutral-500 mt-2">
            We collect, inspect, and return your garments crisp and fresh across Chattarpur & South Delhi.
          </p>
        </div>

        {bookedOrder ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-8 sm:p-12 text-center space-y-6">
            <div className="w-12 h-12 bg-neutral-950 text-white rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-serif font-normal text-neutral-950">
                Pickup Scheduled
              </h3>
              <p className="text-xs text-neutral-500">
                Thank you, {bookedOrder.customer.name}. Our collection team will arrive at your address.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 inline-block text-left text-xs space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                Tracking Reference
              </p>
              <p className="text-lg font-mono font-bold text-neutral-950">
                {bookedOrder.invoiceNumber}
              </p>
              <p className="text-neutral-500 text-[11px] pt-1">
                📍 {bookedOrder.customer.address}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <a
                href={`https://wa.me/918700548416?text=${encodeURIComponent(
                  `Hello Al Haram, I booked a pickup for Ref #${bookedOrder.invoiceNumber}. Customer: ${bookedOrder.customer.name}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold py-3 px-6 rounded-full transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Confirm on WhatsApp</span>
              </a>

              <a
                href={`/track?query=${bookedOrder.invoiceNumber}`}
                className="border border-neutral-200 text-neutral-800 hover:bg-neutral-100 text-xs font-semibold py-3 px-6 rounded-full transition flex items-center justify-center gap-2"
              >
                <span>Track Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-950 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                  Mobile (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-950 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                  Pickup Address (Chattarpur / Delhi) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="House/Apartment, Colony/Sector, Landmark"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-950 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.pickupDate}
                  onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-950 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                  Time Slot *
                </label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-950 transition"
                >
                  <option>Morning (9:00 AM – 1:00 PM)</option>
                  <option>Afternoon (1:00 PM – 5:00 PM)</option>
                  <option>Evening (5:00 PM – 9:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                  Estimated Quantity
                </label>
                <select
                  value={formData.estimatedGarments}
                  onChange={(e) => setFormData({ ...formData, estimatedGarments: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-950 transition"
                >
                  <option>1 – 5 garments</option>
                  <option>6 – 10 garments</option>
                  <option>10 – 20 garments</option>
                  <option>20+ garments (Bulk/Linens)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1.5">
                  Special Fabric Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Silk saree stain, express requirement"
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-950 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs uppercase tracking-wider py-4 rounded-full transition shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Scheduling Pickup...</span>
              ) : (
                <>
                  <span>Schedule Free Pickup</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
