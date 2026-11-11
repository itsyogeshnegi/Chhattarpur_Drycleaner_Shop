'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { Menu, X, LogOut, Layers, LogIn, UserPlus, Search } from 'lucide-react';
import CustomerHistoryModal from '@/components/CustomerHistoryModal';

export default function Navbar() {
  const { customer, openAuthModal, logout } = useCustomerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo matching the PrintEase style: Blue layered icon + Brand Name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 group-hover:text-brand-600 transition">
                Al-Haram
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 -mt-1">
                Dry Cleaning &amp; Laundry
              </span>
            </div>
          </Link>

          {/* Center Navigation Links matching reference: Home, Services, Pricing, How It Works, Contact */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-700">
            <Link
              href="/"
              className="text-brand-600 font-bold transition hover:text-brand-700"
            >
              Home
            </Link>
            <Link
              href="#services"
              className="hover:text-brand-600 transition-colors"
            >
              Services
            </Link>
            <Link
              href="#pricing"
              className="hover:text-brand-600 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#how-it-works"
              className="hover:text-brand-600 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#contact"
              className="hover:text-brand-600 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right Action Items: Track Order + Sign In / Sign Up + Book Now */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {/* Customer Account & Order History Pill */}
            {customer ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full pl-1.5 pr-3 py-1.5 text-xs transition shadow-2xs group cursor-pointer"
                  title="View Customer Profile & Track Orders"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[11px] shadow-xs group-hover:scale-105 transition-transform">
                    {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="text-left">
                    <span className="font-extrabold text-slate-900 max-w-[85px] truncate block leading-tight">
                      {customer.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-brand-600 font-bold block leading-none">
                      Track Orders
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(true)}
                  className="text-xs sm:text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-xl transition shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Track Order by Invoice or Mobile"
                >
                  Track Order
                </button>

                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-brand-600 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="text-xs sm:text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </>
            )}

            {/* Primary Action Button: solid vibrant royal blue "Book Now" */}
            <a
              href="#book-pickup"
              className="bg-brand-600 hover:bg-brand-700 active:scale-98 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Book Now</span>
            </a>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            {!customer && (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition cursor-pointer"
              >
                Sign In
              </button>
            )}
            <a
              href="#book-pickup"
              className="bg-brand-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm"
            >
              Pickup
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-brand-600 rounded-lg border border-slate-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-5 pt-3 pb-6 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold text-brand-600 py-2 border-b border-slate-100"
          >
            Home
          </Link>
          <Link
            href="#services"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-slate-700 py-2 border-b border-slate-100"
          >
            Services
          </Link>
          <Link
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-slate-700 py-2 border-b border-slate-100"
          >
            Pricing &amp; Tariff
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-slate-700 py-2 border-b border-slate-100"
          >
            How It Works
          </Link>
          <Link
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-slate-700 py-2 border-b border-slate-100"
          >
            About Us
          </Link>
          <Link
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-slate-700 py-2 border-b border-slate-100"
          >
            Contact
          </Link>

          {/* Account inside mobile menu */}
          <div className="pt-2 space-y-2">
            {customer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900">{customer.name}</p>
                    <p className="text-slate-500">{customer.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setHistoryModalOpen(true);
                    }}
                    className="bg-brand-600 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    My Orders
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('register');
                    }}
                    className="flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Sign Up</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setHistoryModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track Order</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Customer Order History & Profile Modal */}
      <CustomerHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </header>
  );
}
