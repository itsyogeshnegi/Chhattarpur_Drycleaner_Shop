'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Minus, X, ArrowRight, MessageSquare } from 'lucide-react';

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

  const cartList = Object.entries(cart);
  const totalAmount = cartList.reduce((acc, [, item]) => acc + item.rate * item.quantity, 0);
  const totalItemCount = cartList.reduce((acc, [, item]) => acc + item.quantity, 0);

  return (
    <section id="rates" className="py-24 bg-[#fafafa] border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Minimal Section Header */}
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-[0.25em] font-semibold text-neutral-400 mb-2">
            Transparent Tariff
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal text-neutral-950 tracking-tight">
            Rate Card & Live Estimator
          </h2>
          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
            Select items to preview your dry cleaning or pressing costs. No hidden fees. Free collection across Chattarpur.
          </p>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 pb-2 md:pb-0 md:border-none">
            {[
              { id: 'all', label: 'All Services' },
              { id: 'mens', label: "Men's" },
              { id: 'womens', label: "Women's" },
              { id: 'home', label: 'Home & Bedding' },
              { id: 'laundry', label: 'Laundry (Kg/Pc)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`text-xs uppercase tracking-wider font-semibold px-4 py-2 rounded-full transition-all ${
                  activeTab === tab.id
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search garments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-full text-xs text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:border-neutral-950 transition"
            />
          </div>
        </div>

        {/* Main Grid: Item List (left) + Minimal Estimator (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Rate List Rows (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100 overflow-hidden shadow-xs">
            {filteredServices.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400">
                No items match your search.
              </div>
            ) : (
              filteredServices.map((item, idx) => (
                <div
                  key={item._id || item.id || `${item.category}-${item.name}-${idx}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/60 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-neutral-900 text-sm">{item.name}</h4>
                      <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                        {item.unit}
                      </span>
                    </div>
                    {item.rateRangeText ? (
                      <p className="text-[11px] text-neutral-500 mt-0.5">{item.rateRangeText}</p>
                    ) : null}
                  </div>

                  {/* Actions / Rates */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => addToCart(item, 'dry_clean')}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white transition flex items-center gap-2 text-neutral-800"
                    >
                      <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold group-hover:text-neutral-300">
                        Dry Clean
                      </span>
                      <span className="font-bold">₹{item.dryCleanRate}</span>
                      <Plus className="w-3 h-3 opacity-60" />
                    </button>

                    {item.steamIronRate && item.steamIronRate > 0 ? (
                      <button
                        onClick={() => addToCart(item, 'steam_iron')}
                        className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white transition flex items-center gap-2 text-neutral-800"
                      >
                        <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                          Press
                        </span>
                        <span className="font-bold">₹{item.steamIronRate}</span>
                        <Plus className="w-3 h-3 opacity-60" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Minimal Sticky Estimate Card (4 cols) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs sticky top-28 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="font-serif text-lg font-normal text-neutral-950">Your Estimate</h3>
                <p className="text-xs text-neutral-400">{totalItemCount} garments selected</p>
              </div>
              {cartList.length > 0 && (
                <button
                  onClick={() => setCart({})}
                  className="text-xs text-neutral-400 hover:text-neutral-900 transition"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Selected items */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
              {cartList.length === 0 ? (
                <p className="text-neutral-400 py-6 text-center text-xs leading-relaxed">
                  Click any item from the rate card to calculate your total.
                </p>
              ) : (
                cartList.map(([key, item]) => (
                  <div key={key} className="flex justify-between items-center py-1">
                    <div>
                      <p className="font-semibold text-neutral-900">{item.name}</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                        {item.serviceType === 'dry_clean' ? 'Dry Clean' : 'Steam Press'} · ₹{item.rate}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-neutral-200 rounded-full px-2 py-0.5 gap-2">
                        <button onClick={() => updateQuantity(key, -1)} className="hover:text-neutral-900">
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold text-neutral-800 text-[11px]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(key, 1)} className="hover:text-neutral-900">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <span className="font-bold text-neutral-900 text-xs min-w-10 text-right">
                        ₹{item.rate * item.quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total */}
            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Doorstep Collection</span>
                <span className="text-neutral-950 font-medium">Free</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-neutral-950">
                  Estimated Total
                </span>
                <span className="text-2xl font-serif font-bold text-neutral-950">₹{totalAmount}/-</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2">
              <a
                href="#pickup-booking"
                className="w-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold py-3 px-4 rounded-full transition flex items-center justify-center gap-2"
              >
                <span>Book Pickup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              {totalAmount > 0 && (
                <a
                  href={`https://wa.me/918700548416?text=${encodeURIComponent(
                    `Hello Al Haram, I have an estimate of ₹${totalAmount} (${totalItemCount} garments). Please arrange a pickup.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-transparent hover:bg-neutral-50 text-neutral-800 border border-neutral-200 text-xs font-semibold py-2.5 px-4 rounded-full transition flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send to WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
