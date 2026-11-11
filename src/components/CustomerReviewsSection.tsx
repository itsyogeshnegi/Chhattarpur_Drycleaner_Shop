'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { sanitizePhoneInput } from '@/lib/phone';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  Star,
  ShieldCheck,
  MessageSquarePlus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Quote,
  Lock,
  Settings,
} from 'lucide-react';

interface CustomerReview {
  _id: string;
  name: string;
  role: string;
  serviceType: string;
  rating: number;
  comment: string;
  isVerifiedCustomer?: boolean;
  isApproved?: boolean;
  createdAt?: string;
}

const AVATAR_STYLES = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
];

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Fair',
  3: 'Good Service',
  4: 'Very Good',
  5: 'Excellent Experience',
};

const SERVICE_OPTIONS = [
  'Dry Cleaning & Steam Press',
  'Suit & Sherwani Dry Cleaning',
  'Saree & Ethnic Care',
  'Steam Ironing & Blankets',
  'Wash & Fold Laundry',
  'Curtains, Carpet & Upholstery',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || 'AH';
}

export default function CustomerReviewsSection() {
  const { customer, openAuthModal } = useCustomerAuth();

  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5.0);
  const [totalReviews, setTotalReviews] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);

  // Carousel state (active automatically when more than 3 reviews exist)
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [slidesPerView, setSlidesPerView] = useState<number>(3);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  // Write Review Modal state (Creation by signed-in customer only; Admin edits/approves in Admin Dashboard)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pendingOpenAfterAuth, setPendingOpenAfterAuth] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Form fields
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>(SERVICE_OPTIONS[0]);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [submitStatusMsg, setSubmitStatusMsg] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useBodyScrollLock(isModalOpen);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
        setAverageRating(Number(data.averageRating) || 5.0);
        setTotalReviews(Number(data.totalReviews) || data.reviews.length);
      }
    } catch {
      // Fail gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Automatically open Write Review modal right after user completes login
  useEffect(() => {
    if (customer && pendingOpenAfterAuth) {
      setPendingOpenAfterAuth(false);
      setName(customer.name || '');
      if (customer.phone) setPhone(sanitizePhoneInput(customer.phone));
      setFormError('');
      setSubmitStatusMsg('');
      setIsModalOpen(true);
    }
  }, [customer, pendingOpenAfterAuth]);

  const handleWriteReviewClick = () => {
    if (!customer) {
      setPendingOpenAfterAuth(true);
      openAuthModal('login');
      return;
    }

    setName(customer.name || '');
    if (customer.phone) setPhone(sanitizePhoneInput(customer.phone));
    setFormError('');
    setSubmitStatusMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customer) {
      setIsModalOpen(false);
      setPendingOpenAfterAuth(true);
      openAuthModal('login');
      return;
    }

    if (name.trim().length < 2) {
      setFormError('Please enter your name (at least 2 characters).');
      return;
    }

    if (comment.trim().length < 8) {
      setFormError('Please share at least a sentence about your experience.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          role: role.trim() || undefined,
          serviceType,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        setIsModalOpen(false);
        setPendingOpenAfterAuth(true);
        openAuthModal('login');
        return;
      }

      if (!res.ok || !data.success) {
        setFormError(data.message || 'Could not submit your review. Please try again.');
        return;
      }

      // If admin created it and it's auto-approved, show immediately; otherwise awaits admin approval
      if (data.review?.isApproved) {
        setReviews((prev) => [data.review, ...prev]);
      }
      if (typeof data.averageRating === 'number') setAverageRating(data.averageRating);
      if (typeof data.totalReviews === 'number') setTotalReviews(data.totalReviews);

      setSubmitStatusMsg(
        data.message || 'Review submitted! It will appear once approved by Admin.'
      );
      setComment('');
      setRole('');
      setRating(5);

      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitStatusMsg('');
      }, 2200);
    } catch {
      setFormError('Network error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCarouselActive = reviews.length > 3;
  const maxIndex = Math.max(0, reviews.length - slidesPerView);

  // Responsive slides per view for the reviews carousel
  useEffect(() => {
    const updateSlidesPerView = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= 1024) {
        setSlidesPerView(3);
      } else if (window.innerWidth >= 640) {
        setSlidesPerView(2);
      } else {
        setSlidesPerView(1);
      }
    };

    updateSlidesPerView();
    window.addEventListener('resize', updateSlidesPerView);
    return () => window.removeEventListener('resize', updateSlidesPerView);
  }, []);

  // Keep slide index within bounds when viewport or review count changes
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const handlePrevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const handleNextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  // Auto-advance carousel every 3 seconds when more than 3 reviews exist
  useEffect(() => {
    if (!isCarouselActive || isPaused || isModalOpen || maxIndex <= 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [isCarouselActive, isPaused, isModalOpen, maxIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !isCarouselActive) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const diff = touchStartX.current - endX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNextSlide();
      else handlePrevSlide();
    }
    touchStartX.current = null;
  };

  const activeStar = hoverRating || rating;

  const renderReviewCard = (rev: CustomerReview, idx: number) => {
    const avatarStyle = AVATAR_STYLES[idx % AVATAR_STYLES.length];
    const formattedDate = rev.createdAt
      ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 space-y-4 shadow-2xs hover:shadow-md hover:border-brand-200/80 transition flex flex-col justify-between h-full">
        <div className="space-y-3">
          {/* Top Row: Stars & Service Tag */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((starNum) => (
                <Star
                  key={starNum}
                  className={`w-3.5 h-3.5 ${
                    starNum <= rev.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            {rev.serviceType && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate max-w-[160px]">
                {rev.serviceType}
              </span>
            )}
          </div>

          {/* Comment */}
          <div className="relative">
            <Quote className="w-4 h-4 text-brand-200 mb-1" />
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              &ldquo;{rev.comment}&rdquo;
            </p>
          </div>
        </div>

        {/* Author Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarStyle}`}
            >
              {getInitials(rev.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  {rev.name}
                </h4>
                {rev.isVerifiedCustomer && (
                  <span
                    title="Verified Al-Haram Customer"
                    className="inline-flex items-center text-emerald-600 shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{rev.role}</p>
            </div>
          </div>

          {formattedDate && (
            <span className="text-[10px] text-slate-400 shrink-0">{formattedDate}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section id="reviews" className="py-16 sm:py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Row: Tag, Title, Rating Summary & Auth-Gated CTA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-brand-600 inline-block"></span>
              Customer Reviews &amp; Ratings
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              Trusted by Our Customers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Verified feedback from families and professionals across Chattarpur &amp; South Delhi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Rating Pill */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-extrabold text-slate-900">
                  {averageRating.toFixed(1)}
                </span>
              </div>
              <span className="h-4 w-px bg-slate-200"></span>
              <span className="text-xs font-semibold text-slate-600">
                {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
              </span>
            </div>

            {/* Admin-only direct management shortcut */}
            {customer?.role === 'admin' && (
              <Link
                href="/admin/reviews"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition"
              >
                <Settings className="w-4 h-4" />
                <span>Manage Reviews</span>
              </Link>
            )}

            {/* Write a Review Button (Signed-in users submit; guests prompted to sign in) */}
            <button
              type="button"
              onClick={handleWriteReviewClick}
              title={
                customer
                  ? 'Submit a new customer review'
                  : 'Sign in with your customer account to submit a review'
              }
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              {customer ? (
                <>
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Write a Review</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign in to Write a Review</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Review Cards Grid (Read-only for public & customers; editing/approving/deleting is Admin-only) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-xl border border-slate-200/80 p-6 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              Be the first signed-in customer to share a review of our dry cleaning &amp; laundry care!
            </p>
            <button
              type="button"
              onClick={handleWriteReviewClick}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer"
            >
              {customer ? <MessageSquarePlus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{customer ? 'Leave First Review' : 'Sign in to Leave Review'}</span>
            </button>
          </div>
        ) : isCarouselActive ? (
          /* Auto-sliding 3-second Carousel with Arrows & Dots when > 3 reviews exist */
          <div
            className="space-y-5"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className="relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Left Floating Arrow (Desktop/Tablet) */}
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Previous customer review"
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-brand-600 hover:border-brand-300 active:scale-95 transition absolute -left-4 lg:-left-5 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Sliding Track Viewport */}
              <div className="overflow-hidden -mx-2 sm:-mx-3 py-1">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(-${currentIndex * (100 / slidesPerView)}%)`,
                  }}
                >
                  {reviews.map((rev, idx) => (
                    <div
                      key={rev._id}
                      style={{ width: `${100 / slidesPerView}%` }}
                      className="shrink-0 px-2 sm:px-3"
                    >
                      {renderReviewCard(rev, idx)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Floating Arrow (Desktop/Tablet) */}
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Next customer review"
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:text-brand-600 hover:border-brand-300 active:scale-95 transition absolute -right-4 lg:-right-5 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Controls: Prev Arrow + Pagination Dots + Next Arrow */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Previous review slide"
                className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-brand-600 shadow-2xs transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxIndex + 1 }).map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setCurrentIndex(dotIdx)}
                    aria-label={`Go to review slide ${dotIdx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      dotIdx === currentIndex
                        ? 'w-6 bg-brand-600'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Next review slide"
                className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-brand-600 shadow-2xs transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Static 3-Column Grid when 3 or fewer reviews exist */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((rev, idx) => (
              <div key={rev._id}>{renderReviewCard(rev, idx)}</div>
            ))}
          </div>
        )}
      </div>

      {/* Centered Write a Review Modal via React Portal (Signed-in customer creation only) */}
      {mounted &&
        isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden overscroll-none bg-slate-900/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-linear-to-r from-brand-700 to-brand-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-brand-100 block">
                    Signed in as {customer?.name}
                  </span>
                  <h3 id="review-modal-title" className="text-lg font-extrabold">
                    Submit a Customer Review
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition cursor-pointer"
                  aria-label="Close review modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto overscroll-contain">
                {submitStatusMsg ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Thank You for Your Review!
                    </h4>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                      {submitStatusMsg}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Interactive Star Selector */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Rate Our Service Quality
                      </span>
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <button
                            key={starValue}
                            type="button"
                            onMouseEnter={() => setHoverRating(starValue)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(starValue)}
                            className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                            aria-label={`Rate ${starValue} out of 5 stars`}
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                starValue <= activeStar
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-brand-700">
                        {RATING_LABELS[activeStar] || 'Select Rating'} ({activeStar}/5)
                      </p>
                    </div>

                    {/* Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Display Name *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={60}
                          placeholder="e.g. Rahul Verma"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Registered Mobile
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    {/* Service & Role */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Service Used
                        </label>
                        <select
                          value={serviceType}
                          onChange={(e) => setServiceType(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                        >
                          {SERVICE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Locality / Profession (Optional)
                        </label>
                        <input
                          type="text"
                          maxLength={50}
                          placeholder="e.g. Chattarpur / Business"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Your Review *
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {comment.length}/500
                        </span>
                      </div>
                      <textarea
                        required
                        rows={3}
                        maxLength={500}
                        placeholder="Share how our cleaning, pressing, pickup or OTP delivery worked for you..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 resize-none"
                      />
                    </div>

                    {customer?.role !== 'admin' && (
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Note: Submitted reviews are checked and approved by Al-Haram Admin before appearing publicly. Only Admin can edit or remove reviews.
                      </p>
                    )}

                    {formError && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
                      >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{submitting ? 'Submitting...' : 'Submit Review'}</span>
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
