'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import {
  isRangePriceItem,
  OWNER_CONNECT_LABEL,
  OWNER_CONNECT_NOTE,
} from '@/lib/servicePricing';
import {
  Search,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Tag,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
  PhoneCall,
} from 'lucide-react';

interface RateItem {
  _id?: string;
  id?: string;
  name: string;
  category: 'mens' | 'womens' | 'home' | 'laundry';
  dryCleanRate: number;
  steamIronRate?: number;
  rateRangeText?: string;
  isPriceRange?: boolean;
  unit: string;
}

interface CartItem {
  name: string;
  serviceType: 'dry_clean' | 'steam_iron';
  rate: number;
  quantity: number;
  isPriceRange?: boolean;
}

interface RateCalculatorProps {
  initialServices: RateItem[];
}

export default function RateCalculator({ initialServices }: RateCalculatorProps) {
  const { customer, openAuthModal } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState<'mens' | 'womens' | 'home' | 'laundry'>('mens');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [showAllItems, setShowAllItems] = useState(false);

  // Listen for 'clear-cart' custom event
  useEffect(() => {
    const handleClearCart = () => {
      setCart({});
      try {
        localStorage.removeItem('alharam_active_estimate');
      } catch {}
    };

    window.addEventListener('clear-cart', handleClearCart);
    return () => window.removeEventListener('clear-cart', handleClearCart);
  }, []);

  // Filter services by category or search
  const filteredServices = useMemo(() => {
    return initialServices.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (searchQuery.trim().length > 0) {
        return matchesSearch;
      }
      return item.category === activeTab;
    });
  }, [initialServices, activeTab, searchQuery]);

  // Display top items or all items
  const displayedServices = useMemo(() => {
    if (searchQuery.trim().length > 0 || showAllItems) {
      return filteredServices;
    }
    return filteredServices.slice(0, 8); // Show top 8 items initially, matching table proportion
  }, [filteredServices, searchQuery, showAllItems]);

  const addToCart = (item: RateItem, serviceType: 'dry_clean' | 'steam_iron') => {
    const isRange = isRangePriceItem(item);
    const rate = isRange
      ? 0
      : serviceType === 'dry_clean'
      ? item.dryCleanRate
      : item.steamIronRate || 0;
    const key = `${item.name}_${serviceType}`;

    setCart((prev) => {
      const existing = prev[key];
      const newQty = existing ? existing.quantity + 1 : 1;
      const updated = {
        ...prev,
        [key]: {
          name: item.name,
          serviceType,
          rate,
          quantity: newQty,
          isPriceRange: isRange,
        },
      };

      try {
        localStorage.setItem(
          'alharam_active_estimate',
          JSON.stringify(Object.values(updated))
        );
      } catch {}

      return updated;
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;

      let updated = { ...prev };
      if (newQty <= 0) {
        delete updated[key];
      } else {
        updated[key] = {
          ...existing,
          quantity: newQty,
        };
      }

      try {
        localStorage.setItem(
          'alharam_active_estimate',
          JSON.stringify(Object.values(updated))
        );
      } catch {}

      return updated;
    });
  };

  const cartList = Object.entries(cart);
  const totalAmount = cartList.reduce((acc, [, item]) => acc + item.rate * item.quantity, 0);
  const totalItemCount = cartList.reduce((acc, [, item]) => acc + item.quantity, 0);
  const rangeCartItems = cartList.filter(([, item]) => item.isPriceRange || item.rate === 0);
  const hasRangeCartItems = rangeCartItems.length > 0;

  const handleBookWithEstimate = () => {
    if (!customer) {
      openAuthModal('register');
      return;
    }
    const bookingEl = document.getElementById('book-pickup');
    if (bookingEl) {
      bookingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="pricing" className="py-16 sm:py-20 bg-white border-t border-slate-100 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header matching reference image: Tag with dash + bold title */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-brand-600 inline-block"></span>
            Transparent Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Popular Cleaning Prices
          </h2>
        </div>

        {/* 2-Column Grid: Left (8 cols Table) + Right (4 cols Need a Custom Quote?) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Side: Table with category tabs (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Category Tabs Pill Bar matching reference */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex p-1 bg-slate-100/90 rounded-xl overflow-x-auto max-w-full">
                {[
                  { id: 'mens', label: "Men's Wear" },
                  { id: 'womens', label: "Women's Wear" },
                  { id: 'home', label: 'Home Essentials' },
                  { id: 'laundry', label: 'Laundry (Kg/Pc)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as typeof activeTab);
                      setSearchQuery('');
                    }}
                    className={`text-xs font-bold px-4 py-2 rounded-lg transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tariff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-brand-500 transition"
                />
              </div>
            </div>

            {/* Table Card matching reference */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5">Garment / Item</th>
                      <th className="py-3.5 px-4 text-center">
                        <div>Dry Clean Rate</div>
                        <div className="text-[10px] font-semibold text-emerald-600 normal-case tracking-normal">
                          Full / 50% Adv
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-center">
                        <div>Steam Iron Rate</div>
                        <div className="text-[10px] font-semibold text-emerald-600 normal-case tracking-normal">
                          Full / 50% Adv
                        </div>
                      </th>
                      <th className="py-3.5 px-5 text-right">Add to Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedServices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 text-xs">
                          No garments found matching &ldquo;{searchQuery}&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      displayedServices.map((item, idx) => {
                        const isRange = isRangePriceItem(item);
                        return (
                          <tr
                            key={item._id || item.id || `${item.category}-${item.name}-${idx}`}
                            className="hover:bg-sky-50/30 transition group"
                          >
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900">{item.name}</span>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.unit}
                                </span>
                                {isRange && (
                                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                    <PhoneCall className="w-2.5 h-2.5" />
                                    Range Item
                                  </span>
                                )}
                              </div>
                              {isRange ? (
                                <p className="text-[11px] text-amber-700 font-semibold mt-1">
                                  {item.rateRangeText || 'Owner will connect with you for exact price'}
                                </p>
                              ) : (
                                item.rateRangeText && (
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {item.rateRangeText}
                                  </p>
                                )
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {isRange ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full inline-block shadow-2xs">
                                    Owner will connect with you
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    {item.rateRangeText ? item.rateRangeText.split('|')[0]?.trim() : `Starts from ₹${item.dryCleanRate}`}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-black text-slate-800 text-sm">₹{item.dryCleanRate}</span>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded mt-0.5 whitespace-nowrap">
                                    50% Adv: ₹{Math.ceil(item.dryCleanRate * 0.5)}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {isRange ? (
                                item.steamIronRate && item.steamIronRate > 0 ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full inline-block shadow-2xs">
                                      Owner will connect with you
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                      {item.rateRangeText && item.rateRangeText.includes('|')
                                        ? item.rateRangeText.split('|')[1]?.trim()
                                        : `Starts from ₹${item.steamIronRate}`}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-normal">&mdash;</span>
                                )
                              ) : (
                                item.steamIronRate && item.steamIronRate > 0 ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-black text-slate-700 text-sm">₹{item.steamIronRate}</span>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded mt-0.5 whitespace-nowrap">
                                      50% Adv: ₹{Math.ceil(item.steamIronRate * 0.5)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-normal">&mdash;</span>
                                )
                              )}
                            </td>

                            <td className="py-3.5 px-5 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => addToCart(item, 'dry_clean')}
                                  className={`font-bold text-xs px-2.5 py-1 rounded-md border transition cursor-pointer ${
                                    isRange
                                      ? 'bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 border-amber-200'
                                      : 'bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 border-brand-200'
                                  }`}
                                  title={isRange ? 'Add Range Item to Quote' : 'Add Dry Clean to Estimate'}
                                >
                                  + DC
                                </button>
                                {item.steamIronRate && item.steamIronRate > 0 ? (
                                  <button
                                    onClick={() => addToCart(item, 'steam_iron')}
                                    className={`font-bold text-xs px-2.5 py-1 rounded-md border transition cursor-pointer ${
                                      isRange
                                        ? 'bg-amber-50 hover:bg-amber-800 hover:text-white text-amber-800 border-amber-200'
                                        : 'bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-700 border-slate-200'
                                    }`}
                                    title={isRange ? 'Add Range Item to Quote' : 'Add Steam Press to Estimate'}
                                  >
                                    + Iron
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* View all toggle */}
              {filteredServices.length > 8 && !searchQuery && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => setShowAllItems(!showAllItems)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
                  >
                    {showAllItems
                      ? 'Show Fewer Items'
                      : `View All ${filteredServices.length} Items in this Category ↓`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: "Need a Custom Quote?" Card matching reference (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 sticky top-24">
            {/* Blue Tag Icon */}
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
              <Tag className="w-5 h-5" />
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Need a Custom Quote?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tell us your requirements and get a personalized price with instant pickup scheduling.
              </p>
            </div>

            {/* Live selected garments / estimate calculation */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Selected Garments</span>
                <span className="font-extrabold text-brand-600">{totalItemCount} items</span>
              </div>

              {/* Item List Preview */}
              {cartList.length > 0 ? (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1 text-xs">
                  {cartList.map(([key, item]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center py-1.5 border-b border-slate-200/50"
                    >
                      <div className="max-w-[140px] truncate">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        {item.isPriceRange || item.rate === 0 ? (
                          <span className="text-[10px] text-amber-700 font-bold block">
                            📞 Owner will connect
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block uppercase">
                            {item.serviceType === 'dry_clean' ? 'Dry Clean' : 'Steam Press'} @ ₹{item.rate}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(key, -1)}
                          className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(key, 1)}
                          className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                        {item.isPriceRange || item.rate === 0 ? (
                          <span className="font-bold text-[10px] text-amber-700 min-w-10 text-right whitespace-nowrap">
                            On Quote
                          </span>
                        ) : (
                          <span className="font-bold text-xs text-slate-900 min-w-10 text-right">
                            ₹{item.rate * item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Tap &ldquo;+ DC&rdquo; or &ldquo;+ Iron&rdquo; on any item in the table to calculate your bill.
                </p>
              )}

              {/* Total & 50% Advance Row */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-700">Estimated Total:</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {totalAmount > 0 ? `₹${totalAmount}/-` : hasRangeCartItems ? 'Price on Inspection' : '₹0/-'}
                  </span>
                </div>
                {totalAmount > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-700">50% Advance (Mandatory):</span>
                    <span className="font-black text-emerald-700">₹{Math.ceil(totalAmount * 0.5)}/-</span>
                  </div>
                )}
                {hasRangeCartItems && (
                  <p className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-tight">
                    📞 <span className="font-bold">Includes range items:</span> Our owner will inspect specialty garments upon collection and connect with you to confirm the exact price.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons matching solid blue button in reference */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleBookWithEstimate}
                className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold py-3 px-4 rounded-lg transition shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
              >
                <span>Request a Quote</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {(totalAmount > 0 || hasRangeCartItems) && (
                <a
                  href={`https://wa.me/918700548416?text=${encodeURIComponent(
                    hasRangeCartItems
                      ? `Hello Al-Haram, I have selected ${totalItemCount} garments (including specialty range items: ${rangeCartItems.map(([, i]) => i.name).join(', ')}). Total fixed items estimate: ₹${totalAmount}. Please arrange a pickup and connect with me for the quote.`
                      : `Hello Al-Haram, I have calculated an estimate of ₹${totalAmount} (50% Advance: ₹${Math.ceil(totalAmount * 0.5)}) for ${totalItemCount} garments. Please arrange a pickup.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Estimate to WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
