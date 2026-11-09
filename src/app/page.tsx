import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RateCalculator from '@/components/RateCalculator';
import PickupBookingSection from '@/components/PickupBookingSection';
import { connectToDatabase } from '@/lib/db';
import { ServiceItem } from '@/models/ServiceItem';
import Link from 'next/link';
import { ArrowRight, Phone, MapPin, Clock, ArrowUpRight } from 'lucide-react';

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
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-950 selection:text-white flex flex-col font-sans">
      <Navbar />

      <main className="grow">
        {/* EDITORIAL MINIMAL HERO */}
        <section className="pt-20 pb-24 sm:pt-28 sm:pb-32 px-4 sm:px-6 lg:px-8 border-b border-neutral-100">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Minimal pill badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 text-[11px] uppercase tracking-[0.2em] font-semibold text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Chattarpur · South Delhi
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight text-neutral-950 leading-[1.08]">
              Artisanal Garment Care <br className="hidden sm:inline" />
              <span className="italic font-light text-neutral-600">&</span> Textile Restoration
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-neutral-500 max-w-xl mx-auto font-normal leading-relaxed">
              Specialized dry cleaning, Italian steam pressing, and fabric rejuvenation. From bespoke 3-piece suits and bridal lehengas to heavy winter quilts.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="#pickup-booking"
                className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-800 text-white text-xs uppercase tracking-wider font-semibold px-8 py-4 rounded-full transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Schedule a Pickup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <a
                href="#rates"
                className="w-full sm:w-auto border border-neutral-200 hover:border-neutral-950 text-neutral-800 hover:text-neutral-950 text-xs uppercase tracking-wider font-semibold px-8 py-4 rounded-full transition-all flex items-center justify-center gap-2"
              >
                <span>Explore Rate Card</span>
              </a>
            </div>

            {/* Minimal metrics */}
            <div className="pt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-neutral-100 max-w-3xl mx-auto text-left">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Service</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">Complimentary Pickup</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Turnaround</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">24 – 48 Hours</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Solvents</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">100% Eco-Safe</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Garments</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">50+ Fabric Profiles</p>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE CATEGORIES (Clean Editorial Grid) */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-neutral-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-16">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-semibold text-neutral-400 mb-2">
                  Specialized Disciplines
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif font-normal text-neutral-950 tracking-tight">
                  Textile Care by Category
                </h2>
              </div>
              <p className="text-xs text-neutral-500 max-w-sm">
                Each garment receives customized thermal cycles, solvent purification, and hand-inspection.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category 1 */}
              <div className="p-8 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:border-neutral-950 transition-colors">
                <div>
                  <span className="text-xs font-mono font-bold text-neutral-400">01</span>
                  <h3 className="font-serif text-xl font-normal text-neutral-950 mt-4">
                    Men&apos;s Tailoring
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    3-Piece Suits (₹400), Coats (₹250), Sherwanis (₹500), Silk Kurta Pajamas, Leather Jackets (₹700), Shirts (₹100).
                  </p>
                </div>
                <a href="#rates" className="text-xs font-semibold uppercase tracking-wider text-neutral-950 mt-8 flex items-center gap-1">
                  <span>View 19 Items</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Category 2 */}
              <div className="p-8 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:border-neutral-950 transition-colors">
                <div>
                  <span className="text-xs font-mono font-bold text-neutral-400">02</span>
                  <h3 className="font-serif text-xl font-normal text-neutral-950 mt-4">
                    Women&apos;s Couture
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    Bridal Lehengas (from ₹600), Zari Sarees (from ₹200), Pashmina Shawls (₹500), Evening Gowns, Cardigans, Hand Bags.
                  </p>
                </div>
                <a href="#rates" className="text-xs font-semibold uppercase tracking-wider text-neutral-950 mt-8 flex items-center gap-1">
                  <span>View 21 Items</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Category 3 */}
              <div className="p-8 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:border-neutral-950 transition-colors">
                <div>
                  <span className="text-xs font-mono font-bold text-neutral-400">03</span>
                  <h3 className="font-serif text-xl font-normal text-neutral-950 mt-4">
                    Home & Bedding
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    Single/Double Quilts & Razais (₹250/₹450), Blankets (₹250/₹400), Sofa Sets (₹350/seat), Curtains, and Carpets (₹35/sq ft).
                  </p>
                </div>
                <a href="#rates" className="text-xs font-semibold uppercase tracking-wider text-neutral-950 mt-8 flex items-center gap-1">
                  <span>View 11 Items</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Category 4 */}
              <div className="p-8 border border-neutral-200/80 rounded-2xl flex flex-col justify-between hover:border-neutral-950 transition-colors">
                <div>
                  <span className="text-xs font-mono font-bold text-neutral-400">04</span>
                  <h3 className="font-serif text-xl font-normal text-neutral-950 mt-4">
                    Launderette Bulk
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    Washing & pressing per piece at ₹40, or bulk everyday laundry washing & pressing at ₹100 per Kg. Crisply folded.
                  </p>
                </div>
                <a href="#rates" className="text-xs font-semibold uppercase tracking-wider text-neutral-950 mt-8 flex items-center gap-1">
                  <span>Per Piece & Per Kg</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* RATE CALCULATOR */}
        <RateCalculator initialServices={services} />

        {/* PROCESS STEPS */}
        <section id="process" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-neutral-100">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-16">
              <p className="text-xs uppercase tracking-[0.25em] font-semibold text-neutral-400 mb-2">
                Operational Discipline
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-normal text-neutral-950 tracking-tight">
                How It Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <span className="text-3xl font-serif text-neutral-300">01</span>
                <h3 className="text-lg font-semibold text-neutral-900">Book Collection</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Choose a convenient date and time slot online or via WhatsApp. Our rider arrives at your doorstep in Chattarpur with clean bags.
                </p>
              </div>

              <div className="space-y-4">
                <span className="text-3xl font-serif text-neutral-300">02</span>
                <h3 className="text-lg font-semibold text-neutral-900">Inspection & Textile Care</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Garments are tagged for pre-existing fabric conditions, treated with non-abrasive eco solvents, and hand-finished on steam forms.
                </p>
              </div>

              <div className="space-y-4">
                <span className="text-3xl font-serif text-neutral-300">03</span>
                <h3 className="text-lg font-semibold text-neutral-900">Doorstep Return</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  You receive an instant digital invoice on WhatsApp. Clothes are returned fresh, on custom hangers or in breathable covers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PICKUP BOOKING */}
        <PickupBookingSection />

        {/* STORE LOCATION & WORKSHOP */}
        <section id="location" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#fafafa]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 space-y-6">
              <p className="text-xs uppercase tracking-[0.25em] font-semibold text-neutral-400">
                Facility & Atelier
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-normal text-neutral-950 tracking-tight">
                Visit Our Chattarpur Store
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-lg">
                Conveniently located in Birla Farm Colony to service Chattarpur, Mehrauli, and wider South Delhi residents with direct counter drop-offs and express turnaround.
              </p>

              <div className="space-y-3 pt-2 text-xs text-neutral-600">
                <p className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <span>A-1/67, Birla Farm Colony, Chattarpur, New Delhi - 110074</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Monday – Sunday: 9:00 AM – 9:00 PM</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>+91 87005 48416 · +91 88513 07434</span>
                </p>
              </div>

              <div className="pt-2">
                <a
                  href="https://maps.google.com/?q=A-1/67,+Birla+Farm+Colony,+Chattarpur,+New+Delhi-110074"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-950 underline underline-offset-4 hover:text-neutral-700"
                >
                  <span>Open Directions on Google Maps</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="md:col-span-5 bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-xs space-y-5">
              <h3 className="font-serif text-xl font-normal text-neutral-950">
                Direct Counter Drop-Offs
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Prefer to bring your suits, sarees, or winter razais in person? Our counter is open seven days a week with digital billing and immediate tagging.
              </p>

              <div className="pt-2">
                <a
                  href="tel:+918700548416"
                  className="w-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs uppercase tracking-wider font-semibold py-3.5 px-6 rounded-full transition flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Store Counter</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
