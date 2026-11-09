import Link from 'next/link';
import { MessageSquare, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-neutral-950 text-neutral-400 pt-20 pb-12 border-t border-neutral-900 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-neutral-900">
          {/* Brand Info (4 cols) */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-serif text-2xl font-normal text-white tracking-tight">
                AL-HARAM
              </span>
              <span className="block text-[10px] tracking-[0.25em] uppercase text-neutral-500 font-medium">
                Drycleaners & Launderettes
              </span>
            </Link>
            <p className="text-neutral-500 text-xs leading-relaxed max-w-sm">
              Artisanal dry cleaning, delicate fabric restoration, and Italian steam pressing in Chattarpur, New Delhi.
            </p>
          </div>

          {/* Quick links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-neutral-200">
              Services & Pricing
            </p>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="#rates" className="hover:text-white transition">
                  Men&apos;s Tailoring Tariff (19 items)
                </Link>
              </li>
              <li>
                <Link href="#rates" className="hover:text-white transition">
                  Women&apos;s Couture & Sarees (21 items)
                </Link>
              </li>
              <li>
                <Link href="#rates" className="hover:text-white transition">
                  Quilts, Blankets & Home (11 items)
                </Link>
              </li>
              <li>
                <Link href="#rates" className="hover:text-white transition">
                  Bulk Launderette (Per Piece / Per Kg)
                </Link>
              </li>
            </ul>
          </div>

          {/* Portal Links (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-neutral-200">
              Account & Tracker
            </p>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/track" className="hover:text-white transition flex items-center gap-1">
                  <span>Track Clothes</span>
                  <ArrowUpRight className="w-3 h-3 opacity-50" />
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition flex items-center gap-1">
                  <span>Staff Portal</span>
                  <ArrowUpRight className="w-3 h-3 opacity-50" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-neutral-200">
              Store & Workshop
            </p>
            <p className="text-neutral-400 leading-relaxed">
              A-1/67, Birla Farm Colony, Chattarpur, New Delhi - 110074
            </p>
            <div className="pt-1 space-y-1 text-neutral-300">
              <a href="tel:+918700548416" className="block hover:text-white transition">
                +91 87005 48416
              </a>
              <a href="tel:+918851307434" className="block hover:text-white transition">
                +91 88513 07434
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-neutral-600 text-[11px]">
          <p>© {new Date().getFullYear()} AL-HARAM Drycleaner&apos;s And Launderettes. All rights reserved.</p>
          <p>Chattarpur · South Delhi</p>
        </div>
      </div>

      {/* Minimal Floating WhatsApp Button */}
      <a
        href="https://wa.me/918700548416?text=Hello%20Al%20Haram,%20I%20would%20like%20to%20book%20a%20dry%20cleaning%20pickup."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Direct WhatsApp Chat"
        className="fixed bottom-6 right-6 z-40 bg-neutral-900 hover:bg-neutral-800 text-white p-3.5 rounded-full shadow-lg border border-neutral-800 hover:scale-105 transition-all flex items-center justify-center group"
      >
        <MessageSquare className="w-5 h-5 text-emerald-400" />
      </a>
    </footer>
  );
}
