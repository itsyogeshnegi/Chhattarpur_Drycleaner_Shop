import Link from 'next/link';
import { Phone, Mail, MapPin, Instagram, Youtube, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-900 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-slate-800/80">
          {/* Col 1: Brand Info (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-brand-200/60 flex items-center justify-center text-brand-600 shrink-0">
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
                <span className="font-extrabold text-xl text-white tracking-tight">
                  Al-Haram
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 -mt-0.5">
                  Dry Cleaning &amp; Laundry
                </span>
              </div>
            </Link>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Premium dry cleaning and laundry service with free doorstep pickup and delivery across Chattarpur, Mehrauli &amp; South Delhi.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links (2.5 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <p className="text-xs uppercase tracking-wider font-extrabold text-white">
              Quick Links
            </p>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-white transition">
                  Services
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-white transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#about" className="hover:text-white transition">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Support (2.5 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs uppercase tracking-wider font-extrabold text-white">
              Support
            </p>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <Link href="#how-it-works" className="hover:text-white transition">
                  FAQs
                </Link>
              </li>
              <li>
                <a href="tel:+918700548416" className="hover:text-white transition">
                  Contact Us
                </a>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition">
                  Staff Portal
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <p className="text-xs uppercase tracking-wider font-extrabold text-white">
              Contact
            </p>
            <ul className="space-y-2.5 text-slate-400 text-xs">
              <li>
                <a
                  href="tel:+918700548416"
                  className="hover:text-white transition flex items-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>+91 87005 48416</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@alharamdrycleaners.com"
                  className="hover:text-white transition flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>support@alharamdrycleaners.com</span>
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span>Chattarpur, South Delhi, Delhi NCR, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} Al-Haram Drycleaners &amp; Launderettes. All rights reserved.</p>
          <p>Carefully hand-treated fabric restoration &amp; Italian steam pressing.</p>
        </div>
      </div>
    </footer>
  );
}
