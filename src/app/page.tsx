import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RateCalculator from '@/components/RateCalculator';
import PickupBookingSection from '@/components/PickupBookingSection';
import { connectToDatabase } from '@/lib/db';
import { ServiceItem } from '@/models/ServiceItem';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Leaf,
  Calendar,
  Package,
  Zap,
  Tag,
  CheckCircle2,
  Phone,
  MessageSquare,
  Sparkles,
  Clock,
} from 'lucide-react';

async function getServices() {
  try {
    await connectToDatabase();
    const items = await ServiceItem.find({ isActive: true })
      .select('name category dryCleanRate steamIronRate rateRangeText unit popular')
      .sort({ category: 1, popular: -1, name: 1 })
      .lean();

    return JSON.parse(JSON.stringify(items));
  } catch (error) {
    console.error('Failed to load services:', error);
    return [];
  }
}

export const revalidate = 60;

export default async function HomePage() {
  const services = await getServices();

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-brand-600 selection:text-white flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <main className="grow">
        {/* 1. HERO SECTION (Clean, minimal, smaller text matching reference design) */}
        <section className="relative pt-8 pb-14 sm:pt-12 sm:pb-18 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50/50 via-white to-white overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Hero Left Content (6 cols) */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-5">
              {/* Pickup • Clean • Deliver Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-brand-200 text-brand-700 text-[11px] font-bold">
                <span className="flex h-1.5 w-1.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Pickup &bull; Clean &bull; Deliver</span>
              </div>

              {/* Main Headline - Reduced size for elegant balance */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-slate-900 leading-[1.18]">
                Expert Dry Cleaning &amp; <br />
                Laundry at{' '}
                <span className="text-brand-600">Your Doorstep</span>
              </h1>

              {/* Subtitle - Short, punchy, smaller text */}
              <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                Premium cleaning for your everyday and special garments. Schedule a pickup, we&apos;ll take care of the rest.
              </p>

              {/* Action Buttons: Book a Pickup & View Pricing */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <a
                  href="#book-pickup"
                  className="bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
                >
                  <span>Book a Pickup</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="#pricing"
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition shadow-2xs text-center flex items-center justify-center"
                >
                  <span>View Pricing</span>
                </a>
              </div>

              {/* 3 Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Free Pickup &amp; Delivery*</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Fabric Safe Cleaning</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-brand-600" />
                  <span>Eco-Friendly Process</span>
                </span>
              </div>
            </div>

            {/* Hero Right Visual (6 cols) */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-lg bg-slate-100 max-h-[400px] sm:max-h-[460px]">
                <Image
                  src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=80"
                  alt="Crisp freshly dry-cleaned shirts on wooden hangers on a modern clothes rack"
                  width={1200}
                  height={800}
                  priority
                  className="w-full h-[320px] sm:h-[420px] object-cover hover:scale-102 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. OUR SERVICES SECTION */}
        <section id="services" className="py-12 sm:py-16 bg-white border-t border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
            {/* Header: Title + View All Services link */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Our Services
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Professional fabric care tailored for delicate and everyday wear.
                </p>
              </div>

              <a
                href="#pricing"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 transition shrink-0"
              >
                <span>View All Services</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* 4 Clean Service Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Service 1: Dry Cleaning */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-md hover:border-brand-300 transition relative flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-5 h-5 stroke-brand-600 fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2.7 13.5A2 2 0 0 0 4.2 17h15.6a2 2 0 0 0 1.5-3.5L13.7 7.3c.5-.5.8-1.1.8-1.8A2.5 2.5 0 0 0 12 3z" />
                      <path d="M4 17h16" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Dry Cleaning
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Professional cleaning for delicate and premium wear.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>From ₹70</span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Service 2: Laundry */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-md hover:border-brand-300 transition relative flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-5 h-5 stroke-brand-600 fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="12" cy="13" r="5" />
                      <path d="M7 6h.01" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Laundry
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Everyday clothes, washed, cleaned and fresh.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>Wash &amp; Steam Press</span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Service 3: Steam Press */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-md hover:border-brand-300 transition relative flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-5 h-5 stroke-brand-600 fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 16h16a1 1 0 0 0 1-1v-2a7 7 0 0 0-7-7H8a4 4 0 0 0-4 4v5a1 1 0 0 0 1 1z" />
                      <path d="M6 19h12" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Steam Press
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Crisp, wrinkle-free finish for a perfect look.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>From ₹25</span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Service 4: Home Care */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-md hover:border-brand-300 transition relative flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-5 h-5 stroke-brand-600 fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
                      <rect x="2" y="11" width="20" height="8" rx="2" />
                      <path d="M4 19v2" />
                      <path d="M20 19v2" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Home Care
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Curtains, bedsheets, blankets and more.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>Quilts from ₹250</span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-12 sm:py-16 bg-slate-50/60 border-t border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-1 max-w-xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="text-xs text-slate-500">
                A simple, hassle-free process in 3 steps
              </p>
            </div>

            {/* 3 Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-4xl mx-auto">
              {/* Step 1 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-brand-200/70 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  1. Book a Pickup
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Schedule at your convenience.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-brand-200/70 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  2. We Clean
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Professional and fabric-safe cleaning.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-brand-200/70 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  3. Get It Delivered
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fresh, clean clothes at your doorstep.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. POPULAR PRICING & BOOK A PICKUP */}
        <PickupBookingSection />

        {/* DETAILED LIVE TARIFF & CALCULATOR (Expandable under #pricing) */}
        <div id="pricing">
          <RateCalculator initialServices={services} />
        </div>

        {/* 5. WHY CHOOSE AL-HARAM? */}
        <section id="about" className="py-12 sm:py-16 bg-white border-t border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-1 max-w-xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Why Choose Al-Haram?
              </h2>
            </div>

            {/* 4 Trust Feature Items in a Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Trusted &amp; Safe</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Care for all fabric types
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Quick Turnaround</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    On-time pickup &amp; delivery
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <Leaf className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Eco-Friendly</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Safe and sustainable cleaning
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Affordable Pricing</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Premium service at fair rates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. WHAT OUR CUSTOMERS SAY */}
        <section className="py-12 sm:py-16 bg-slate-50/60 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-1 max-w-xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                What Our Customers Say
              </h2>
            </div>

            {/* 3 Testimonials in a Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Testimonial 1 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                <p className="text-xs text-slate-600 leading-relaxed">
                  &ldquo;Great service and very convenient pickup. My clothes came back like new!&rdquo;
                </p>
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                    RS
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Rohit Sharma</h4>
                    <div className="flex text-amber-400 text-[10px] mt-0.5">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                <p className="text-xs text-slate-600 leading-relaxed">
                  &ldquo;Reliable, affordable and professional. Highly recommend Al-Haram.&rdquo;
                </p>
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0">
                    PM
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Priya Mehta</h4>
                    <div className="flex text-amber-400 text-[10px] mt-0.5">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                <p className="text-xs text-slate-600 leading-relaxed">
                  &ldquo;The best laundry service in the city. On-time and excellent quality.&rdquo;
                </p>
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    AN
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Aman Negi</h4>
                    <div className="flex text-amber-400 text-[10px] mt-0.5">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. GET DIRECT WHATSAPP & BOOKING BANNER */}
        <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 rounded-3xl p-5 sm:p-8 border border-sky-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Need Fast Doorstep Pickup?
              </h3>
              <p className="text-xs text-slate-600 max-w-lg">
                Book pickups, track orders, and message our counter directly on WhatsApp anytime.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://wa.me/918700548416?text=Hello%20Al%20Haram%20Drycleaners,%20I%20would%20like%20to%20schedule%20a%20pickup."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Us</span>
              </a>

              <Link
                href="/track"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <span>Track Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
