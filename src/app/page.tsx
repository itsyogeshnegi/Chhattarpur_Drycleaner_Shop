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
  Star,
  CheckCircle2,
  Phone,
  MessageSquare,
  Sparkles,
  MapPin,
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
        {/* 1. HERO SECTION (Matching exact pattern from reference with rich text) */}
        <section className="relative pt-10 pb-16 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50/50 via-white to-white overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Hero Left Content (6 cols) */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-6">
              {/* Pickup • Clean • Deliver Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-brand-200/80 text-brand-700 text-xs font-bold tracking-wide">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>South Delhi&apos;s Trusted Fabric Care</span>
                <span className="text-brand-300">&bull;</span>
                <span>Pickup &bull; Clean &bull; Deliver</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] sm:leading-[1.12]">
                Expert Dry Cleaning &amp; <br />
                Laundry at{' '}
                <span className="text-brand-600">Your Doorstep</span>
              </h1>

              {/* Subtitle with Rich Details */}
              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                From 3-piece bespoke suits, bridal lehengas, and silk sarees to winter quilts, blackout curtains, and daily launderette. 100% eco-safe gentle solvents, zero fabric shrinkage, Italian steam pressing, and free doorstep collection across Chattarpur, Mehrauli &amp; South Delhi.
              </p>

              {/* Action Buttons: Book a Pickup & View Pricing */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <a
                  href="#book-pickup"
                  className="bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-xs sm:text-sm px-6 sm:px-7 py-3.5 rounded-xl transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  <span>Book a Free Pickup</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="#pricing"
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm px-6 sm:px-7 py-3.5 rounded-xl transition shadow-2xs text-center flex items-center justify-center gap-1.5"
                >
                  <Tag className="w-4 h-4 text-brand-600" />
                  <span>View Price List &amp; Rates</span>
                </a>
              </div>

              {/* 3 Trust Icons */}
              <div className="pt-3 sm:pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-brand-600" />
                  <span>Free Pickup &amp; Delivery*</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Fabric Safe &amp; Color Protected</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-brand-600" />
                  <span>Eco-Friendly Non-Toxic Solvents</span>
                </span>
              </div>

              {/* Quick Rate Ticker Strip */}
              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                <span className="font-bold text-slate-700">Popular Rates:</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Shirt ₹70</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Trouser ₹100</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Suit (2-Pc) ₹300</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Silk Saree ₹250</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Quilt ₹400</span>
              </div>
            </div>

            {/* Hero Right Visual (6 cols) */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-xl bg-slate-100 max-h-[440px] sm:max-h-[500px]">
                <Image
                  src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=80"
                  alt="Crisp freshly dry-cleaned shirts on wooden hangers on a modern clothes rack"
                  width={1200}
                  height={800}
                  priority
                  className="w-full h-[360px] sm:h-[460px] object-cover hover:scale-102 transition duration-500"
                />

                {/* Subtle soft gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. OUR SERVICES SECTION (Rich informative content with exact same cards pattern) */}
        <section id="services" className="py-14 sm:py-18 bg-white border-t border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
            {/* Header: Title + View All Services link */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Our Garment Care Services
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                  Every fabric demands customized care. We combine advanced eco-safe chemistry with hand finishing to preserve your garments for years.
                </p>
              </div>

              <a
                href="#pricing"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 transition shrink-0"
              >
                <span>View Full Tariff &amp; Rates</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* 4 Clean Service Cards with Rich Descriptions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {/* Service 1: Dry Cleaning */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-6 hover:shadow-lg hover:border-brand-300 transition relative flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-6 h-6 stroke-brand-600 fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2.7 13.5A2 2 0 0 0 4.2 17h15.6a2 2 0 0 0 1.5-3.5L13.7 7.3c.5-.5.8-1.1.8-1.8A2.5 2.5 0 0 0 12 3z" />
                      <path d="M4 17h16" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Expert Dry Cleaning
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hydrocarbon solvent wash for bespoke suits, wedding lehengas, silk sarees, and fine woolens. Zero fabric shrinkage, no harsh chemical odors, and deep oil &amp; collar stain spot removal.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>From ₹70/pc</span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Service 2: Laundry */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-6 hover:shadow-lg hover:border-brand-300 transition relative flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-6 h-6 stroke-brand-600 fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="12" cy="13" r="5" />
                      <path d="M7 6h.01" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Launderette &amp; Wash
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hygienic everyday wash &amp; steam pressing for office shirts, casual trousers, bedsheets, and towels. Treated in RO water with anti-bacterial rinse and skin-safe fabric softeners.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>Wash &amp; Steam Press</span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Service 3: Steam Press */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-6 hover:shadow-lg hover:border-brand-300 transition relative flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-6 h-6 stroke-brand-600 fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 16h16a1 1 0 0 0 1-1v-2a7 7 0 0 0-7-7H8a4 4 0 0 0-4 4v5a1 1 0 0 0 1 1z" />
                      <path d="M6 19h12" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Italian Steam Press
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Vacuum-suction heated tables that eliminate 100% of creases without scorched fabric shine, crushed velvet, or burning delicate silks. Delivers razor-sharp, executive-grade crease lines.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>From ₹25/pc</span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Service 4: Home Care */}
              <div className="group bg-white rounded-2xl border border-slate-200/90 p-6 hover:shadow-lg hover:border-brand-300 transition relative flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <svg
                      className="w-6 h-6 stroke-brand-600 fill-none stroke-[2]"
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
                  <h3 className="font-bold text-slate-900 text-base">
                    Home Linen &amp; Curtains
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Deep sanitization and dust-mite treatment for heavy double quilts, winter razais, blackout curtains, cushion covers, and carpets. Returned hygienically fresh and vacuum-sealed for storage.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <span>Quilts from ₹250</span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS SECTION (Rich step descriptions) */}
        <section id="how-it-works" className="py-14 sm:py-18 bg-slate-50/60 border-t border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Header */}
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                A simple, hassle-free 3-step process designed for busy South Delhi homes.
              </p>
            </div>

            {/* 3 Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative max-w-5xl mx-auto">
              {/* Step 1 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="w-14 h-14 rounded-full bg-sky-50 border border-brand-200/70 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  1. Schedule Free Pickup
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Book online in 30 seconds or message us on WhatsApp. Choose your preferred pickup date, morning or evening time slot, and home address in Chattarpur or South Delhi.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="w-14 h-14 rounded-full bg-sky-50 border border-brand-200/70 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  2. Inspection &amp; Eco Clean
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our rider collects your clothes in clean hampers. Every garment is barcoded, stain-tagged, and cleaned using fabric-safe pH-neutral solvents and Italian steam pressing.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="w-14 h-14 rounded-full bg-sky-50 border border-brand-200/70 text-brand-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  3. Delivered to Your Door
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Delivered back within 24 to 48 hours on sturdy hangers or in dust-proof protective covers. Inspect your garments first, then pay easily via UPI, Card, or Cash.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. POPULAR PRICING & BOOK A PICKUP (Side-by-Side 2-Column Section) */}
        <PickupBookingSection />

        {/* DETAILED LIVE TARIFF & CALCULATOR (Expandable under #full-price-list) */}
        <div id="full-price-list">
          <RateCalculator initialServices={services} />
        </div>

        {/* 5. WHY CHOOSE AL-HARAM? (Rich Trust Pillars) */}
        <section id="about" className="py-14 sm:py-18 bg-white border-t border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Why South Delhi Chooses Al-Haram
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                15+ years of dedicated textile care, trusted by over 10,000+ local families.
              </p>
            </div>

            {/* 4 Trust Feature Items in a Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">Trusted &amp; Safe</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Specialized gentle treatment for pure silks, pashminas, velvets, and bespoke wool suits with zero fiber distortion.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">Quick Turnaround</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Reliable 24 to 48-hour delivery. Online digital tracking lets you view your invoice and cleaning stage in real time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <Leaf className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">100% Eco-Friendly</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Biodegradable non-toxic solvents that protect delicate colors, are hypoallergenic for sensitive skin, and leave zero chemical smell.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition">
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">Affordable Pricing</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Fixed standardized rate list with zero hidden fees. Free doorstep pickup &amp; delivery across Chattarpur for complete convenience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. WHAT OUR CUSTOMERS SAY (Testimonials with local context) */}
        <section className="py-14 sm:py-18 bg-slate-50/60 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                What Our Customers Say
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Verified reviews from satisfied South Delhi residents.
              </p>
            </div>

            {/* 3 Testimonials in a Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Testimonial 1 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-2xs flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                  &ldquo;Sent my bespoke 3-piece wedding suit and silk kurtas for dry cleaning. The Italian steam finish was razor-sharp and the collar stains were 100% gone. Arrived on wooden hangers in protective dust bags. Truly the best fabric care in South Delhi!&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                    RS
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Rohit Sharma</h4>
                    <p className="text-[10px] text-slate-400">DLF Farms, Chattarpur</p>
                    <div className="flex text-amber-400 text-xs mt-0.5">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-2xs flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                  &ldquo;Finding a reliable cleaner for heavy bridal lehengas and kanjivaram sarees in Chattarpur used to be stressful. Al-Haram treated the delicate embroidery with incredible care. No chemical smell and zero color fading!&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0">
                    PM
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Priya Mehta</h4>
                    <p className="text-[10px] text-slate-400">Chattarpur Enclave</p>
                    <div className="flex text-amber-400 text-xs mt-0.5">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-2xs flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                  &ldquo;We use their weekly laundry service and had all our winter quilts and blackout curtains dry cleaned. Outstanding turnaround, polite rider, and being able to book and track invoices online makes it effortless.&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    AN
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Aman Negi</h4>
                    <p className="text-[10px] text-slate-400">Sultanpur, South Delhi</p>
                    <div className="flex text-amber-400 text-xs mt-0.5">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. GET THE APP / MOBILE BANNER (Soft blue rounded container with rich info) */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 rounded-3xl p-6 sm:p-10 border border-sky-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Phone Illustration Mockup */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-20 sm:w-24 h-36 sm:h-40 bg-slate-950 rounded-2xl border-4 border-slate-800 shadow-xl p-2.5 flex flex-col justify-between text-white text-center">
                <div className="w-6 h-1 bg-slate-700 rounded-full mx-auto" />
                <div className="space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 mx-auto flex items-center justify-center text-white">
                    <svg
                      className="w-5 h-5 stroke-white fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2.7 13.5A2 2 0 0 0 4.2 17h15.6a2 2 0 0 0 1.5-3.5L13.7 7.3c.5-.5.8-1.1.8-1.8A2.5 2.5 0 0 0 12 3z" />
                    </svg>
                  </div>
                  <p className="text-[8px] font-bold">Al-Haram</p>
                </div>
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto" />
              </div>
            </div>

            {/* Middle Text with Store Hours & Location */}
            <div className="space-y-2 text-center lg:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-white/70 px-3 py-1 rounded-full border border-brand-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Open 7 Days a Week: 9:00 AM – 9:00 PM</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Direct WhatsApp Pickup &amp; Live Order Tracking
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Need urgent express service or have delicate silk garments? Message our Chattarpur counter directly on WhatsApp or track your invoice status online anytime.
              </p>
            </div>

            {/* Right Buttons: Instant WhatsApp & Track Order */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <a
                href="https://wa.me/918700548416?text=Hello%20Al%20Haram%20Drycleaners,%20I%20would%20like%20to%20schedule%20a%20pickup."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition shadow-sm flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Book via WhatsApp</span>
              </a>

              <Link
                href="/track"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition shadow-sm flex items-center gap-2"
              >
                <span>Track Order Live</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
