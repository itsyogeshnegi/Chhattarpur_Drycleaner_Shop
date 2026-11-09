'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowUpRight, Phone } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex flex-col group">
            <span className="font-extrabold text-xl sm:text-2xl tracking-tighter text-neutral-950 font-serif">
              AL-HARAM
            </span>
            <span className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 font-medium">
              Drycleaners & Launderettes
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider font-semibold text-neutral-600">
            <Link href="#rates" className="hover:text-neutral-950 transition-colors">
              Rate Card
            </Link>
            <Link href="#process" className="hover:text-neutral-950 transition-colors">
              Process
            </Link>
            <Link href="/track" className="hover:text-neutral-950 transition-colors flex items-center gap-1">
              <span>Track Order</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
            </Link>
            <Link href="#location" className="hover:text-neutral-950 transition-colors">
              Chattarpur Store
            </Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:+918700548416"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-950 transition flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+91 87005 48416</span>
            </a>
            <a
              href="#pickup-booking"
              className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-all tracking-wide"
            >
              Book Pickup
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href="#pickup-booking"
              className="bg-neutral-950 text-white text-xs font-semibold px-4 py-2 rounded-full"
            >
              Pickup
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-900"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-100 bg-white px-6 py-6 space-y-4 text-sm font-medium">
          <Link
            href="#rates"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-700 py-1"
          >
            Rate Card & Pricing
          </Link>
          <Link
            href="#process"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-700 py-1"
          >
            How It Works
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-900 font-semibold py-1"
          >
            Track Order / View Invoice
          </Link>
          <Link
            href="#location"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-700 py-1"
          >
            Store Location
          </Link>
          <Link
            href="/admin/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs uppercase tracking-wider text-neutral-400 pt-2"
          >
            Staff Portal
          </Link>
        </div>
      )}
    </header>
  );
}
