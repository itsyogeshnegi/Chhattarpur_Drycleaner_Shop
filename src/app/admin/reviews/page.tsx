'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Star,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  EyeOff,
  Eye,
  ShieldCheck,
  Search,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  Lock,
  Clock,
} from 'lucide-react';

interface AdminReviewRecord {
  _id: string;
  name: string;
  role: string;
  serviceType: string;
  rating: number;
  comment: string;
  isVerifiedCustomer: boolean;
  isApproved: boolean;
  editedByAdmin?: boolean;
  createdAt: string;
}

const SERVICE_OPTIONS = [
  'Dry Cleaning & Steam Press',
  'Suit & Sherwani Dry Cleaning',
  'Saree & Ethnic Care',
  'Steam Ironing & Blankets',
  'Wash & Fold Laundry',
  'Curtains, Carpet & Upholstery',
];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewRecord[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [averageRating, setAverageRating] = useState(5.0);

  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create / Edit Modal state (Admin-only)
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<AdminReviewRecord | null>(null);

  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Chattarpur Resident');
  const [formServiceType, setFormServiceType] = useState(SERVICE_OPTIONS[0]);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [formVerified, setFormVerified] = useState(true);
  const [formApproved, setFormApproved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAllReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reviews?all=true', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAuthRequired(false);
        setReviews(data.reviews || []);
        setTotalReviews(data.totalReviews || 0);
        setApprovedCount(data.approvedCount || 0);
        setPendingCount(data.pendingCount || 0);
        setAverageRating(data.averageRating || 5.0);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Failed to load reviews from database.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllReviews();
  }, [fetchAllReviews]);

  const openCreateModal = () => {
    setEditingReview(null);
    setFormName('');
    setFormRole('Chattarpur Resident');
    setFormServiceType(SERVICE_OPTIONS[0]);
    setFormRating(5);
    setFormComment('');
    setFormVerified(true);
    setFormApproved(true);
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (rev: AdminReviewRecord) => {
    setEditingReview(rev);
    setFormName(rev.name);
    setFormRole(rev.role || 'Verified Customer');
    setFormServiceType(rev.serviceType || SERVICE_OPTIONS[0]);
    setFormRating(rev.rating || 5);
    setFormComment(rev.comment);
    setFormVerified(Boolean(rev.isVerifiedCustomer));
    setFormApproved(Boolean(rev.isApproved));
    setModalError('');
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (formName.trim().length < 2) {
      setModalError('Customer name must be at least 2 characters.');
      return;
    }
    if (formComment.trim().length < 8) {
      setModalError('Review comment must be at least 8 characters.');
      return;
    }

    try {
      setSaving(true);
      const isEdit = Boolean(editingReview);
      const url = isEdit ? `/api/reviews/${editingReview!._id}` : '/api/reviews';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          role: formRole.trim() || 'Verified Customer',
          serviceType: formServiceType,
          rating: formRating,
          comment: formComment.trim(),
          isVerifiedCustomer: formVerified,
          isApproved: formApproved,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalError(data.message || 'Operation failed.');
        return;
      }

      setModalOpen(false);
      setFeedback({
        type: 'success',
        text: isEdit ? 'Review updated by Admin.' : 'New review created & saved by Admin.',
      });
      await fetchAllReviews();
    } catch {
      setModalError('Network error saving review.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApproval = async (rev: AdminReviewRecord) => {
    try {
      setBusyId(rev._id);
      const res = await fetch(`/api/reviews/${rev._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: !rev.isApproved }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          text: !rev.isApproved
            ? `Review by "${rev.name}" approved and published live!`
            : `Review by "${rev.name}" hidden from public homepage.`,
        });
        await fetchAllReviews();
      } else {
        setFeedback({ type: 'error', text: data.message || 'Could not update approval status.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error updating review status.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setConfirmDeleteId(null);
        setFeedback({ type: 'success', text: 'Review deleted permanently.' });
        await fetchAllReviews();
      } else {
        setFeedback({ type: 'error', text: data.message || 'Failed to delete review.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error deleting review.' });
    } finally {
      setBusyId(null);
    }
  };

  const filteredReviews = reviews.filter((rev) => {
    if (filterStatus === 'approved' && !rev.isApproved) return false;
    if (filterStatus === 'pending' && rev.isApproved) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        rev.name.toLowerCase().includes(q) ||
        rev.comment.toLowerCase().includes(q) ||
        (rev.serviceType || '').toLowerCase().includes(q) ||
        (rev.role || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (authRequired) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Admin Access Required</h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Only signed-in Administrators can approve, edit, create, or delete customer reviews. Please sign in via the Admin Portal.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition"
        >
          Go to Admin Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-extrabold text-brand-700 tracking-wider block">
            Admin-Only Review Moderation &amp; Publishing
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Customer Reviews Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Customers can submit new reviews from the homepage; only Admin can approve, edit, or delete reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAllReviews}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Review</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500">Total Reviews</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalReviews}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-700">Published Live</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600">Pending Approval</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500">Average Live Rating</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
            <span>{averageRating.toFixed(1)}</span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
        <div className="relative grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, comment, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { key: 'all', label: `All (${totalReviews})` },
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'approved', label: `Published (${approvedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs font-bold text-slate-500">
          Loading customer reviews...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">No reviews match this filter.</p>
          <p className="text-xs text-slate-400">Try clearing search or add a customer review above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => (
            <div
              key={rev._id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between gap-4 ${
                rev.isApproved ? 'border-slate-200' : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              <div className="space-y-3">
                {/* Status & Rating Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((starNum) => (
                      <Star
                        key={starNum}
                        className={`w-4 h-4 ${
                          starNum <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-xs font-extrabold text-slate-700">
                      ({rev.rating}/5)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {rev.isVerifiedCustomer && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Order
                      </span>
                    )}
                    {rev.isApproved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" />
                        Pending Approval
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  &ldquo;{rev.comment}&rdquo;
                </p>

                {/* Reviewer Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900">{rev.name}</span>
                    <span className="text-slate-400 mx-1.5">•</span>
                    <span className="text-slate-500">{rev.role}</span>
                    {rev.editedByAdmin && (
                      <span className="ml-2 text-[10px] text-indigo-600 font-semibold">
                        (Admin Edited)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {rev.serviceType}
                  </span>
                </div>
              </div>

              {/* Admin Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400">
                  {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Approve / Hide Toggle */}
                  <button
                    type="button"
                    disabled={busyId === rev._id}
                    onClick={() => handleToggleApproval(rev)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      rev.isApproved
                        ? 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {rev.isApproved ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Approve &amp; Publish</span>
                      </>
                    )}
                  </button>

                  {/* Edit Review (Admin Only) */}
                  <button
                    type="button"
                    disabled={busyId === rev._id}
                    onClick={() => openEditModal(rev)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Delete Review (Admin Only with confirmation) */}
                  {confirmDeleteId === rev._id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busyId === rev._id}
                        onClick={() => handleDelete(rev._id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === rev._id}
                      onClick={() => setConfirmDeleteId(rev._id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Centered Create / Edit Review Modal via Portal (Admin Only) */}
      {mounted &&
        modalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-brand-300 block">
                    Admin Review Control
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold">
                    {editingReview ? 'Edit Customer Review' : 'Add New Customer Review'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="p-6 space-y-4">
                {/* Star Rating */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <span className="text-xs font-bold text-slate-700">Star Rating</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((starNum) => (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => setFormRating(starNum)}
                        className="p-0.5 hover:scale-110 transition cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            starNum <= formRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Role / Locality
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Service Category
                  </label>
                  <select
                    value={formServiceType}
                    onChange={(e) => setFormServiceType(e.target.value)}
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
                    Review Comment *
                  </label>
                  <textarea
                    required
                    rows={3}
                    maxLength={500}
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formApproved}
                      onChange={(e) => setFormApproved(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Approved &amp; Published on Website</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formVerified}
                      onChange={(e) => setFormVerified(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Verified Customer Badge</span>
                  </label>
                </div>

                {modalError && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-xs cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingReview ? 'Save Changes' : 'Create Review'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

