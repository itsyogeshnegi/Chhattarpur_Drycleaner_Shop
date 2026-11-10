'use client';

import { useState, useMemo } from 'react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import {
  Search,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Shirt,
  Tag,
  Trash2,
  Truck,
  UserPlus,
} from 'lucide-react';

interface RateItem {
  _id?: string;
  id?: string;
  name: string;
  category: 'mens' | 'womens' | 'home' | 'laundry';
  dryCleanRate: number;
  steamIronRate?: number;
  rateRangeText?: string;
  unit: string;
}

interface CartItem {
  name: string;
  serviceType: 'dry_clean' | 'steam_iron';
  rate: number;
  quantity: number;
}

interface RateCalculatorProps {
  initialServices: RateItem[];
}

export default function RateCalculator({ initialServices }: RateCalculatorProps) {
  const { customer, openAuthModal } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'mens' | 'womens' | 'home' | 'laundry'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  const filteredServices = useMemo(() => {
    return initialServices.filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialServices, activeTab, searchQuery]);

  const addToCart = (item: RateItem, serviceType: 'dry_clean' | 'steam_iron') => {
    const rate = serviceType === 'dry_clean' ? item.dryCleanRate : (item.steamIronRate || 0);
    const key = `${item.name}_${serviceType}`;

    setCart((prev) => {
      const existing = prev[key];
      const newQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [key]: {
          name: item.name,
          serviceType,
          rate,
          quantity: newQty,
        },
      };
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return {
        ...prev,
        [key]: {
          ...existing,
          quantity: newQty,
        },
      };
    });
  };

  const handleBookWithEstimate = (e: React.MouseEvent) => {
    if (!customer) {
      e.preventDefault();
      openAuthModal('register');
    }
  };

  const cartList = Object.entries(cart);
  const totalAmount = cartList.reduce((acc, [, item]) => acc + item.rate * item.quantity, 0);
  const totalItemCount = cartList.reduce((acc, [, item]) => acc + item.quantity, 0);

  return (
    <section id="rates" className="py-14 sm:py-20 bg-slate-50 border-t border-slate-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-brand-600" />
              <span>Transparent Price Card</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tariff List &amp; Live Bill Estimator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              No hidden charges. Select garments below to preview your exact dry cleaning or Italian steam pressing cost. Free doorstep collection in Chattarpur.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-slate-200 shadow-2xs self-start md:self-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Free Doorstep Collection &amp; Return</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5 sm:gap-4 mb-6 sm:mb-8">
          {/* Horizontal scrollable tabs for mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { id: 'all', label: 'All Services (50+)' },
              { id: 'mens', label: "Men's Tailoring" },
              { id: 'womens', label: "Women's & Sarees" },
              { id: 'home', label: 'Quilts & Blankets' },
              { id: 'laundry', label: 'Launderette' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`text-xs font-extrabold px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl transition-all whitespace-nowrap shrink-0 shadow-2xs ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search garments (e.g. suit, saree)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs transition"
            />
          </div>
        </div>

        {/* Main Grid: Tariff Rows (Left) + Sticky Estimator (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Rate List Rows (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex justify-between items-center">
              <span>Garment Item &amp; Fabric Category</span>
              <span>Service &amp; Price</span>
            </div>

            {/* Scrollable list window */}
            <div className="max-h-[520px] sm:max-h-[640px] overflow-y-auto divide-y divide-slate-100 pr-0.5">
              {filteredServices.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  No garments found matching &quot;{searchQuery}&quot;. Please try another keyword.
                </div>
              ) : (
                filteredServices.map((item, idx) => (
                  <div
                    key={item._id || item.id || `${item.category}-${item.name}-${idx}`}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50/80 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {item.unit}
                        </span>
                      </div>
                      {item.rateRangeText ? (
                        <p className="text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                          <span>🏷️</span>
                          <span>{item.rateRangeText}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                          Category: {item.category.replace('_', ' ')}
                        </p>
                      )}
                    </div>

                    {/* Pricing Action Chips */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Dry Clean Chip */}
                      <button
                        onClick={() => addToCart(item, 'dry_clean')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-brand-200 bg-brand-50/90 hover:bg-brand-600 hover:text-white text-brand-800 transition flex items-center gap-1.5 group shadow-2xs active:scale-95 touch-manipulation min-h-[36px]"
                      >
                        <span className="text-[10px] uppercase tracking-wider text-brand-600 font-extrabold group-hover:text-white">
                          Dry Clean
                        </span>
                        <span className="font-black text-xs sm:text-sm">₹{item.dryCleanRate}</span>
                        <Plus className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                      </button>

                      {/* Steam Press Chip */}
                      {item.steamIronRate && item.steamIronRate > 0 ? (
                        <button
                          onClick={() => addToCart(item, 'steam_iron')}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-600 hover:text-white text-amber-900 transition flex items-center gap-1.5 group shadow-2xs active:scale-95 touch-manipulation min-h-[36px]"
                        >
                          <span className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold group-hover:text-white">
                            Press
                          </span>
                          <span className="font-black text-xs sm:text-sm">₹{item.steamIronRate}</span>
                          <Plus className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Estimate Receipt Card (4 cols) */}
          <div
            id="estimate-summary"
            className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-brand-200/80 shadow-lg shadow-brand-500/5 lg:sticky lg:top-28 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <h3 className="font-extrabold text-base text-slate-900">Estimated Cost</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {totalItemCount} {totalItemCount === 1 ? 'garment' : 'garments'} selected
                </p>
              </div>

              {cartList.length > 0 && (
                <button
                  onClick={() => setCart({})}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Selected items list */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs divide-y divide-slate-100">
              {cartList.length === 0 ? (
                <div className="text-slate-400 py-6 text-center text-xs space-y-2">
                  <Shirt className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="leading-relaxed px-4">
                    Tap &quot;+ Dry Clean&quot; or &quot;+ Press&quot; on any garment in the list to calculate your estimate.
                  </p>
                </div>
              ) : (
                cartList.map(([key, item]) => (
                  <div key={key} className="flex justify-between items-center pt-2">
                    <div className="pr-2 flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">
                        {item.serviceType === 'dry_clean' ? '✨ Dry Clean' : '💨 Steam Press'} @ ₹{item.rate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg px-1.5 py-0.5 gap-1.5 bg-slate-50">
                        <button
                          onClick={() => updateQuantity(key, -1)}
                          className="text-slate-600 hover:text-slate-900 p-0.5 touch-manipulation"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-extrabold text-slate-900 text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(key, 1)}
                          className="text-slate-600 hover:text-slate-900 p-0.5 touch-manipulation"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <span className="font-black text-slate-900 text-xs min-w-10 text-right">
                        ₹{item.rate * item.quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total breakdown */}
            <div className="border-t border-slate-200 pt-3.5 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Doorstep Collection &amp; Drop</span>
                <span className="text-emerald-700 font-bold uppercase text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                  Free
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-200">
                <span className="text-xs uppercase tracking-wider font-extrabold text-slate-900">
                  Estimated Total
                </span>
                <span className="text-2xl font-black text-brand-700">₹{totalAmount}/-</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-1">
              <a
                href="#pickup-booking"
                onClick={handleBookWithEstimate}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold py-3.5 px-4 rounded-xl transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                {customer ? (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Book Free Pickup with this Estimate</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account &amp; Book Pickup</span>
                  </>
                )}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              {totalAmount > 0 && (
                <a
                  href={`https://wa.me/918700548416?text=${encodeURIComponent(
                    `Hello Al Haram Drycleaners, I have an estimate of ₹${totalAmount} (${totalItemCount} garments). Please arrange a pickup from my address in Chattarpur.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send Estimate to WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Bottom Live Estimate Bar (Visible on mobile/tablet when items in cart) */}
      {totalItemCount > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-slate-950/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-black text-xs shrink-0 shadow-md">
              {totalItemCount}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estimated Total</p>
              <p className="text-base font-black text-brand-400 truncate">₹{totalAmount}/-</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#estimate-summary"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              View Items
            </a>
            <a
              href="#pickup-booking"
              onClick={handleBookWithEstimate}
              className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition flex items-center gap-1 shadow-md"
            >
              <span>Pickup</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
