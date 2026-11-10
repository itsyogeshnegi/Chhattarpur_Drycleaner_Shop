import Link from 'next/link';
import { Layers, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#0c182b] text-slate-400 pt-16 pb-10 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-14 border-b border-slate-800/80">
          {/* Column 1: Brand & Socials (4 cols) */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Al-Haram
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Professional dry cleaning and laundry services for businesses, events, couture wear, and personal garments.
            </p>
            {/* Social Icons matching reference */}
            <div className="flex items-center gap-3 pt-2 text-slate-400">
              <a
                href="https://wa.me/918700548416"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-brand-600 hover:text-white flex items-center justify-center transition"
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                </svg>
              </a>
              <a
                href="tel:+918700548416"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-brand-600 hover:text-white flex items-center justify-center transition"
                aria-label="Phone"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="mailto:contact@alharamdrycleaners.com"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-brand-600 hover:text-white flex items-center justify-center transition"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-white transition">
                  Products &amp; Services
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-brand-400 text-slate-500 transition">
                  Staff Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Products / Services (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Services
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  Business Printing / Suits
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  Event / Wedding Sarees
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  Home &amp; Blankets
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">
                  Custom / Launderette
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Contact Us
            </h4>
            <div className="space-y-2 text-slate-400">
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <a href="tel:+918700548416" className="hover:text-white transition">
                  +91 87005 48416
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <a href="mailto:hello@alharamcleaners.com" className="hover:text-white transition">
                  hello@alharamcleaners.com
                </a>
              </p>
              <p className="flex items-start gap-2 pt-1 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                <span>A-1/67, Birla Farm Colony, Chattarpur, New Delhi - 110074</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar matching reference */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500 text-[11px]">
          <p>&copy; {new Date().getFullYear()} Al-Haram. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#about" className="hover:text-slate-400 transition">Privacy Policy</a>
            <a href="#about" className="hover:text-slate-400 transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
