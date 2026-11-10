'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { Menu, X, Phone, LogOut, UserPlus } from 'lucide-react';

export default function Navbar() {
  const { customer, openAuthModal, logout } = useCustomerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo with clean clothes hanger icon */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-brand-200/60 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform shrink-0">
              <svg
                className="w-6 h-6 stroke-brand-600 fill-none stroke-[2.2]"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2.7 13.5A2 2 0 0 0 4.2 17h15.6a2 2 0 0 0 1.5-3.5L13.7 7.3c.5-.5.8-1.1.8-1.8A2.5 2.5 0 0 0 12 3z" />
                <path d="M4 17h16" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 group-hover:text-brand-600 transition">
                Al-Haram
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 -mt-0.5">
                Dry Cleaning &amp; Laundry
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links (Home, Services, Pricing, How It Works, About) */}
          <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-semibold text-slate-700">
            <Link
              href="/"
              className="text-brand-600 font-bold border-b-2 border-brand-600 pb-0.5 transition"
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
              href="#about"
              className="hover:text-brand-600 transition-colors"
            >
              About
            </Link>
          </nav>

          {/* Right Action Items: Phone Pill + Book Now CTA + Account */}
          <div className="hidden md:flex items-center gap-3">
            {/* Phone Pill */}
            <a
              href="tel:+918700548416"
              className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-full transition flex items-center gap-1.5 shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5 text-brand-600" />
              <span>+91 87005 48416</span>
            </a>

            {/* Customer Account Pill */}
            {customer ? (
              <div className="flex items-center gap-1.5 bg-sky-50 border border-brand-200 rounded-full pl-2 pr-3 py-1 text-xs">
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[11px]">
                  {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <span className="font-bold text-slate-800 max-w-[100px] truncate">
                  {customer.name.split(' ')[0]}
                </span>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="text-slate-400 hover:text-red-600 ml-1 transition"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="text-xs font-bold text-slate-600 hover:text-brand-600 px-2 py-1.5 rounded-lg transition"
              >
                Sign In
              </button>
            )}

            {/* Book Now Primary Button */}
            <a
              href="#book-pickup"
              className="bg-brand-600 hover:bg-brand-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-md shadow-brand-500/20"
            >
              Book Now
            </a>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            {customer ? (
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="bg-sky-50 text-brand-700 border border-brand-200 text-xs font-bold px-3 py-1.5 rounded-full"
              >
                Sign In
              </button>
            )}

            <a
              href="#book-pickup"
              className="bg-brand-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs"
            >
              Book
            </a>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-5 py-5 space-y-3.5 text-sm font-medium animate-fade-in">
          {customer ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <p className="font-bold text-emerald-900">{customer.name}</p>
                  <p className="text-[10px] text-emerald-700">+91 {customer.phone || customer.userId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-red-600 bg-white px-2.5 py-1 rounded-lg border border-red-200"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-brand-900">Customer Account</p>
                <p className="text-[10px] text-slate-500">Sign in to book &amp; track pickups</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('register');
                }}
                className="text-xs font-bold text-white bg-brand-600 px-3 py-1.5 rounded-lg"
              >
                Sign In / Join
              </button>
            </div>
          )}

          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-brand-600 font-bold py-1"
          >
            Home
          </Link>
          <Link
            href="#services"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 py-1"
          >
            Services
          </Link>
          <Link
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 py-1"
          >
            Pricing
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 py-1"
          >
            How It Works
          </Link>
          <Link
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 py-1"
          >
            About
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 py-1"
          >
            Track Order / Invoices
          </Link>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <a
              href="tel:+918700548416"
              className="text-xs font-bold text-brand-700 flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+91 87005 48416</span>
            </a>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[11px] uppercase tracking-wider text-slate-400 font-bold"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
