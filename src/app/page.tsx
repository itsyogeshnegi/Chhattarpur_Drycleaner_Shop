import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RateCalculator from '@/components/RateCalculator';
import PickupBookingSection from '@/components/PickupBookingSection';
import CustomerReviewsSection from '@/components/CustomerReviewsSection';
import { connectToDatabase } from '@/lib/db';
import { ServiceItem } from '@/models/ServiceItem';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  CreditCard,
  Zap,
  Award,
  Headphones,
  Calendar,
  Layers,
  Sparkles,
  Home,
  Shirt,
  Upload,
  FileText,
  Package,
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
        {/* =========================================================
            SECTION 1: HERO SECTION matching reference layout & colors
           ========================================================= */}
        <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden border-b border-slate-100">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Pill Tag: Laundry & Dry Cleaning */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#eef5ff] text-brand-600 text-xs sm:text-sm font-semibold">
                <span>Laundry &amp; Dry Cleaning</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Expert Dry Cleaning <br />
                <span className="text-brand-600">&amp; Steam Pressing</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-500 max-w-lg leading-relaxed pt-1">
                Professional care for your everyday wear, delicates and special garments. Pick up, clean and deliver at your doorstep.
              </p>

              {/* Buttons: Solid Blue "Book a Pickup ->" + Outline "View Pricing" */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  href="#book-pickup"
                  className="bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Book a Pickup</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="#pricing"
                  className="bg-white hover:bg-slate-50 active:scale-98 border border-slate-300 text-slate-800 font-semibold text-sm px-6 py-3.5 rounded-xl transition shadow-2xs text-center flex items-center justify-center"
                >
                  <span>View Pricing</span>
                </a>
              </div>

              {/* 3 Inline Trust Features below matching reference image */}
              <div className="pt-4 flex flex-wrap items-center gap-6 sm:gap-8 text-xs sm:text-sm font-medium text-slate-600">
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-600" />
                  <span>Free Pickup &amp; Delivery</span>
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Safe &amp; Hygienic Cleaning</span>
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span>Fabric Friendly</span>
                </span>
              </div>
            </div>

            {/* Right Visual Column: Stack of Folded Shirts Visual matching reference image (5 cols) */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-[440px] flex items-center justify-center select-none">
                <Image
                  src="/images/hero-shirts.webp"
                  alt="Expert Dry Cleaning & Steam Pressing - Folded shirts"
                  width={855}
                  height={790}
                  priority
                  className="w-full max-w-[460px] sm:max-w-[490px] h-auto object-contain select-none transition-transform duration-500 hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>

          {/* Centered "Our Services" transition pill matching reference image */}
          <div className="flex justify-center -mb-24 pt-16 relative z-10">
            <a
              href="#services"
              className="px-5 py-1.5 rounded-full bg-[#eef5ff] hover:bg-blue-100/70 text-brand-600 text-xs font-semibold border border-blue-200/50 shadow-2xs transition"
            >
              Our Services
            </a>
          </div>
        </section>

        {/* =========================================================
            SECTION 2: "Explore Our Printing Services" -> "Explore Our Dry Cleaning Services"
           ========================================================= */}
        <section id="services" className="py-16 sm:py-20 bg-white border-b border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header: Tag with dash + Title */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-brand-600 inline-block"></span>
                Our Services
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                Explore Our Dry Cleaning Services
              </h2>
            </div>

            {/* 4 Cards in a horizontal row matching reference image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Business Printing / Suits */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 hover:shadow-md hover:border-brand-300 transition duration-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Business Dry Cleaning
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Business suits, coats, blazers, letterheads, shirts, trousers &amp; ties.
                  </p>
                </div>
                <a
                  href="#pricing"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 group"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              {/* Card 2: Event Printing / Couture */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 hover:shadow-md hover:border-brand-300 transition duration-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-rose-500">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Event &amp; Wedding Wear
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bridal lehengas, zari sarees, silk kurtas, sherwanis &amp; pashmina shawls.
                  </p>
                </div>
                <a
                  href="#pricing"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 group"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              {/* Card 3: Marketing Materials / Home Essentials */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 hover:shadow-md hover:border-brand-300 transition duration-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Home className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Home &amp; Bedding
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Single &amp; double quilts, heavy blankets, sofa seats, curtains &amp; carpets.
                  </p>
                </div>
                <a
                  href="#pricing"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 group"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              {/* Card 4: Custom Printing / Launderette */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 hover:shadow-md hover:border-brand-300 transition duration-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Shirt className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Daily Launderette
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Everyday wash &amp; steam press per piece or bulk washing &amp; pressing per Kg.
                  </p>
                </div>
                <a
                  href="#pricing"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 group"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 3: "Why Choose PrintEase?" -> "Why Choose Al-Haram?"
           ========================================================= */}
        <section id="about" className="py-16 sm:py-20 bg-slate-50/50 border-b border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Centered Heading & Subtitle matching reference image */}
            <div className="text-center space-y-1.5 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Why Choose Al-Haram?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                A simple, reliable and professional garment care experience.
              </p>
            </div>

            {/* 3 Columns with Circular Blue Outline Icons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 max-w-5xl mx-auto">
              {/* Feature 1: Quick Turnaround */}
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full border border-brand-200 bg-white text-brand-600 flex items-center justify-center shadow-2xs">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Quick Turnaround
                </h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Get your clothes cleaned and delivered on time, every time.
                </p>
              </div>

              {/* Feature 2: Top Quality */}
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full border border-brand-200 bg-white text-brand-600 flex items-center justify-center shadow-2xs">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Top Quality
                </h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Eco-friendly solvents, gentle on fabrics, vibrant and lasting freshness.
                </p>
              </div>

              {/* Feature 3: Dedicated Support */}
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full border border-brand-200 bg-white text-brand-600 flex items-center justify-center shadow-2xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Dedicated Support
                </h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Real people, quick and helpful WhatsApp and phone responses.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 4: "Popular Printing Prices" & Rate Calculator
           ========================================================= */}
        <RateCalculator initialServices={services} />

        {/* =========================================================
            SECTION 5: "Print in 4 Simple Steps" -> "Cleaned in 4 Simple Steps"
           ========================================================= */}
        <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50/50 border-b border-slate-100 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header: Tag with dash + Title */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-brand-600 inline-block"></span>
                How It Works
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                Cleaned in 4 Simple Steps
              </h2>
            </div>

            {/* 4 Cards in a horizontal row matching reference image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1: Upload / Schedule */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-600">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Schedule Pickup
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Book online or message us to choose a convenient time slot.
                </p>
              </div>

              {/* Step 2: Get a Quote / Tag & Inspect */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-600">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Get a Quote
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Receive a quick, transparent price and detailed garment inspection.
                </p>
              </div>

              {/* Step 3: We Print / We Clean */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  We Clean
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  High-quality eco-cleaning and precision Italian steam pressing.
                </p>
              </div>

              {/* Step 4: Fast Delivery */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-600">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Fast Delivery
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Get it delivered fresh and ready-to-wear right to your doorstep.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 6: "Request a Printing Quote" Form with Product Visual on the Left
           ========================================================= */}
        <PickupBookingSection />

        {/* =========================================================
            SECTION 7: "Trusted by Our Customers" (Live Reviews & Ratings)
           ========================================================= */}
        <CustomerReviewsSection />
      </main>

      {/* =========================================================
          SECTION 8: Dark Navy Footer matching reference image
         ========================================================= */}
      <Footer />
    </div>
  );
}
