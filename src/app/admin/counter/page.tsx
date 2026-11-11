'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Edit2,
  Save,
  Check,
  X,
  SlidersHorizontal,
  Plus,
  Minus,
  Trash2,
  Camera,
  Printer,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Percent,
  CheckCircle,
  Tag,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { compressImageUnder50KB } from '@/lib/imageCompression';
import { generateWhatsAppInvoiceUrl } from '@/lib/whatsapp';
import { normalizeIndianPhone, sanitizePhoneInput } from '@/lib/phone';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

interface RateItem {
  _id: string;
  name: string;
  category: 'mens' | 'womens' | 'home' | 'laundry';
  dryCleanRate: number;
  steamIronRate?: number;
  rateRangeText?: string;
  unit: string;
}

interface OrderItemDraft {
  name: string;
  serviceType: 'dry_clean' | 'steam_iron' | 'laundry_piece' | 'laundry_kg';
  rate: number;
  quantity: number;
  total: number;
  notes?: string;
  inspectionImages?: Array<{ url: string; caption?: string }>;
}

interface CreatedOrderResponse {
  _id: string;
  invoiceNumber: string;
  customer: { name: string; phone: string; address?: string };
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  status: string;
  rackLocation?: string;
  items: Array<{ name: string; serviceType: string; quantity: number; total: number }>;
}

export default function CounterManagementPage() {
  const [catalog, setCatalog] = useState<RateItem[]>([]);
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'mens' | 'womens' | 'home' | 'laundry'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Garment Rate Catalog Management State (View / Edit Rates)
  const [catalogMode, setCatalogMode] = useState<'pos' | 'edit'>('pos');
  const [editingRates, setEditingRates] = useState<
    Record<string, { dryCleanRate: number; steamIronRate: number; unit: string }>
  >({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [showNewGarmentModal, setShowNewGarmentModal] = useState(false);

  useBodyScrollLock(showNewGarmentModal);
  const [newGarment, setNewGarment] = useState({
    name: '',
    category: 'mens',
    dryCleanRate: 100,
    steamIronRate: 30,
    unit: 'piece',
  });

  const handleRateFieldChange = (
    itemId: string,
    field: 'dryCleanRate' | 'steamIronRate' | 'unit',
    value: string | number
  ) => {
    const item = catalog.find((i) => i._id === itemId);
    const existing = editingRates[itemId] || {
      dryCleanRate: item?.dryCleanRate ?? 0,
      steamIronRate: item?.steamIronRate ?? 0,
      unit: item?.unit ?? 'piece',
    };

    setEditingRates((prev) => ({
      ...prev,
      [itemId]: {
        ...existing,
        [field]: value,
      },
    }));
  };

  const handleSaveRate = async (item: RateItem) => {
    const current = editingRates[item._id] || {
      dryCleanRate: item.dryCleanRate,
      steamIronRate: item.steamIronRate || 0,
      unit: item.unit || 'piece',
    };

    try {
      setSavingItemId(item._id);
      const res = await fetch(`/api/services/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryCleanRate: current.dryCleanRate,
          steamIronRate: current.steamIronRate,
          unit: current.unit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCatalog((prev) =>
          prev.map((i) =>
            i._id === item._id
              ? {
                  ...i,
                  dryCleanRate: current.dryCleanRate,
                  steamIronRate: current.steamIronRate,
                  unit: current.unit,
                }
              : i
          )
        );
        setSavedSuccessId(item._id);
        setTimeout(() => setSavedSuccessId(null), 2500);
      } else {
        alert(data.message || 'Failed to update rate');
      }
    } catch {
      alert('Network error saving rate');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleCreateGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGarment.name.trim()) {
      alert('Please enter a garment name');
      return;
    }

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGarment),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setCatalog((prev) => [data.item, ...prev]);
        setShowNewGarmentModal(false);
        setNewGarment({
          name: '',
          category: 'mens',
          dryCleanRate: 100,
          steamIronRate: 30,
          unit: 'piece',
        });
        alert(`Garment "${data.item.name}" added to catalog!`);
      } else {
        alert(data.message || 'Failed to create garment');
      }
    } catch {
      alert('Failed to connect to server');
    }
  };

  // Customer Details
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // Order Items
  const [items, setItems] = useState<OrderItemDraft[]>([]);

  // Financials
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [rackLocation, setRackLocation] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Image Upload state
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderResponse | null>(null);
  const [error, setError] = useState('');

  // Fetch catalog from MongoDB & auto-fill customer if passed via URL (from Customers List)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const name = sp.get('customerName');
      const phone = sp.get('customerPhone');
      const address = sp.get('customerAddress');
      if (name || phone || address) {
        setCustomer((prev) => ({
          ...prev,
          name: name || prev.name,
          phone: phone ? normalizeIndianPhone(phone) : prev.phone,
          address: address || prev.address,
        }));
      }
    }

    async function fetchCatalog() {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (data.success && data.items) {
          setCatalog(data.items);
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    fetchCatalog();
  }, []);

  // Filter catalog
  const filteredCatalog = catalog.filter((item) => {
    const matchesCat = catalogCategory === 'all' || item.category === catalogCategory;
    const matchesSearch = item.name.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Add Item to Order
  const handleAddItem = (
    item: RateItem,
    serviceType: 'dry_clean' | 'steam_iron' | 'laundry_piece' | 'laundry_kg'
  ) => {
    const rate = serviceType === 'dry_clean' ? item.dryCleanRate : item.steamIronRate || 0;

    setItems((prev) => {
      // Check if item with same service type already in draft
      const existingIdx = prev.findIndex(
        (i) => i.name === item.name && i.serviceType === serviceType
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        const cur = copy[existingIdx];
        const newQty = cur.quantity + 1;
        copy[existingIdx] = {
          ...cur,
          quantity: newQty,
          total: cur.rate * newQty,
        };
        return copy;
      }

      return [
        ...prev,
        {
          name: item.name,
          serviceType,
          rate,
          quantity: 1,
          total: rate,
          notes: '',
          inspectionImages: [],
        },
      ];
    });
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const cur = copy[index];
      const newQty = cur.quantity + delta;

      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }

      copy[index] = {
        ...cur,
        quantity: newQty,
        total: cur.rate * newQty,
      };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Garment Inspection Image Upload (< 50KB guarantee)
  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingImageIndex(index);

      // 1. Client-Side Pre-Compression (< 50KB strict limit)
      const compressedBlob = await compressImageUnder50KB(file);
      console.log(`Garment photo compressed: ${(compressedBlob.size / 1024).toFixed(1)} KB`);

      // 2. Fetch signed Cloudinary upload params
      const signRes = await fetch('/api/cloudinary/sign');
      const signData = await signRes.json();

      if (!signData.success) {
        alert('Could not authenticate Cloudinary signature.');
        return;
      }

      // 3. Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', compressedBlob);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', signData.timestamp.toString());
      formData.append('signature', signData.signature);
      formData.append('folder', signData.folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const cloudData = await cloudRes.json();

      if (cloudData.secure_url) {
        setItems((prev) => {
          const copy = [...prev];
          const cur = copy[index];
          const images = cur.inspectionImages ? [...cur.inspectionImages] : [];
          images.push({ url: cloudData.secure_url, caption: 'Fabric inspection tag' });
          copy[index] = { ...cur, inspectionImages: images };
          return copy;
        });
      } else {
        alert('Cloudinary upload failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      alert(`Error compressing/uploading photo: ${msg}`);
    } finally {
      setUploadingImageIndex(null);
    }
  };

  // Subtotal & Discount calculations
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }

  const grandTotal = Math.max(0, subtotal - discountAmount);
  const balanceAmount = Math.max(0, grandTotal - paidAmount);

  // Submit Order from Counter
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one garment to the order');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          items,
          discountType,
          discountValue,
          paidAmount,
          paymentMethod,
          rackLocation,
          internalNotes,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCreatedOrder(data.order);
      } else {
        setError(data.message || data.error || 'Failed to create order');
      }
    } catch {
      setError('Connection error while saving order');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomer({ name: '', phone: '', email: '', address: '' });
    setItems([]);
    setDiscountType('none');
    setDiscountValue(0);
    setPaidAmount(0);
    setRackLocation('');
    setInternalNotes('');
    setCreatedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[11px] uppercase font-extrabold text-brand-700 tracking-wider">
            POS Terminal & Register
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Counter Management</h1>
          <p className="text-[11px] text-slate-500">
            Create orders, itemize dry cleaning & steam pressing, apply discounts, and attach garment damage photos.
          </p>
        </div>

        {createdOrder && (
          <button
            onClick={resetForm}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            New Walk-in Order
          </button>
        )}
      </div>

      {/* SUCCESS CONFIRMATION MODAL / PANEL */}
      {createdOrder && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Order Successfully Created & Logged
                </span>
                <h3 className="text-2xl font-mono font-black text-slate-900">
                  {createdOrder.invoiceNumber}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* WhatsApp Share */}
              <a
                href={generateWhatsAppInvoiceUrl({
                  customerName: createdOrder.customer.name,
                  customerPhone: createdOrder.customer.phone,
                  invoiceNumber: createdOrder.invoiceNumber,
                  grandTotal: createdOrder.grandTotal,
                  paymentStatus: createdOrder.paymentStatus,
                  paidAmount: createdOrder.paidAmount,
                  balanceAmount: createdOrder.balanceAmount,
                  items: createdOrder.items,
                  status: createdOrder.status,
                  invoiceUrl: `${window.location.origin}/invoice/${createdOrder.invoiceNumber}`,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <MessageSquare className="w-4 h-4" />
                Send WhatsApp Bill
              </a>

              {/* View Dual Invoices */}
              <a
                href={`/admin/invoices/${createdOrder.invoiceNumber}`}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                Dual Invoices (Customer & Internal)
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-emerald-200 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Customer</p>
              <p className="font-extrabold text-slate-800 mt-0.5">{createdOrder.customer.name}</p>
              <p className="text-slate-500">{createdOrder.customer.phone}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Rack Location</p>
              <p className="font-bold text-brand-700 mt-0.5">
                {createdOrder.rackLocation || 'Not Assigned'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Garments</p>
              <p className="font-bold text-slate-800 mt-0.5">{createdOrder.items.length} items</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Net Total / Balance</p>
              <p className="font-black text-emerald-700 text-sm mt-0.5">
                ₹{createdOrder.grandTotal} (Bal: ₹{createdOrder.balanceAmount})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* POS WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Service Item Catalog Selector (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Garment Rate Catalog</h2>
                <span className="text-[11px] text-slate-400">{filteredCatalog.length} services available</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode Switcher: POS Billing vs Edit Rates */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCatalogMode('pos')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    catalogMode === 'pos'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  🛒 Add to Bill
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogMode('edit')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    catalogMode === 'edit'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  ✏️ Edit Rates
                </button>
              </div>

              {/* Add New Garment to Catalog */}
              <button
                type="button"
                onClick={() => setShowNewGarmentModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0"
                title="Add new garment service"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Garment</span>
              </button>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search garment name..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'mens', label: "Men's" },
                { id: 'womens', label: "Women's" },
                { id: 'home', label: 'Home' },
                { id: 'laundry', label: 'Laundry' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCatalogCategory(tab.id as typeof catalogCategory)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                    catalogCategory === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid / List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            {loadingCatalog ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400">
                Loading tariff catalog...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400">
                No items found
              </div>
            ) : catalogMode === 'edit' ? (
              // EDIT RATES CATALOG MODE
              filteredCatalog.map((item) => {
                const currentEdit = editingRates[item._id] || {
                  dryCleanRate: item.dryCleanRate,
                  steamIronRate: item.steamIronRate || 0,
                  unit: item.unit || 'piece',
                };

                return (
                  <div
                    key={item._id}
                    className="p-3 bg-white border border-brand-200 rounded-2xl shadow-xs space-y-2 hover:border-brand-400 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block">{item.name}</span>
                        <span className="text-[9px] uppercase font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        {item.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">
                          Dry Clean Rate (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={currentEdit.dryCleanRate}
                          onChange={(e) =>
                            handleRateFieldChange(item._id, 'dryCleanRate', Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 text-xs focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">
                          Press / Iron Rate (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={currentEdit.steamIronRate}
                          onChange={(e) =>
                            handleRateFieldChange(item._id, 'steamIronRate', Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 text-xs focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">Unit: {item.unit}</span>
                      <button
                        type="button"
                        onClick={() => handleSaveRate(item)}
                        disabled={savingItemId === item._id}
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                          savedSuccessId === item._id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                        }`}
                      >
                        {savingItemId === item._id ? (
                          <span>Saving...</span>
                        ) : savedSuccessId === item._id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Rate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              // POS BILLING SELECTION MODE
              filteredCatalog.map((item, idx) => (
                <div
                  key={item._id || `${item.category}-${item.name}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-brand-400 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded">
                          {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCatalogMode('edit');
                            handleRateFieldChange(item._id, 'dryCleanRate', item.dryCleanRate);
                            handleRateFieldChange(item._id, 'steamIronRate', item.steamIronRate || 0);
                          }}
                          title="Edit this rate"
                          className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {item.rateRangeText && (
                      <p className="text-[10px] text-amber-700 font-medium">{item.rateRangeText}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => handleAddItem(item, 'dry_clean')}
                      className="flex-1 bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 rounded-lg py-1 px-1.5 text-[11px] font-bold flex justify-between transition"
                    >
                      <span>DC</span>
                      <span>₹{item.dryCleanRate}</span>
                    </button>

                    {item.steamIronRate && item.steamIronRate > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddItem(item, 'steam_iron')}
                        className="flex-1 bg-slate-200/70 hover:bg-slate-800 hover:text-white text-slate-700 rounded-lg py-1 px-1.5 text-[11px] font-bold flex justify-between transition"
                      >
                        <span>Press</span>
                        <span>₹{item.steamIronRate}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Current Order Bill & Customer Form (5 cols) */}
        <form
          onSubmit={handleCreateOrder}
          className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Customer Details */}
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm">Customer Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Name *"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="Phone (WhatsApp) *"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: sanitizePhoneInput(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <input
              type="text"
              placeholder="Address / Flat / Colony (Optional)"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

          {/* Selected Line Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Order Items ({items.length})
              </h3>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-red-500 hover:text-red-700 font-bold"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Select garments from catalog to add to bill
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">
                          {item.serviceType.replace('_', ' ')} @ ₹{item.rate}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, -1)}
                            className="p-1 hover:text-brand-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold text-slate-800">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, 1)}
                            className="p-1 hover:text-brand-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-extrabold text-slate-900 min-w-10 text-right">
                          ₹{item.total}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Garment damage photo inspection uploader (< 50KB guarantee) */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-md border border-brand-200">
                          <Camera className="w-3 h-3" />
                          <span>
                            {uploadingImageIndex === idx
                              ? 'Compressing (<50KB)...'
                              : 'Snap / Attach Photo'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={uploadingImageIndex !== null}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleImageUpload(idx, e.target.files[0]);
                              }
                            }}
                          />
                        </label>

                        {item.inspectionImages && item.inspectionImages.length > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {item.inspectionImages.length} tag photo attached
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Tag note (e.g. tear on sleeve)"
                        value={item.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], notes: val };
                            return copy;
                          });
                        }}
                        className="text-[11px] px-2 py-0.5 border border-slate-200 rounded bg-white w-40"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Internal Rack Location & Discount Option (Requirement 3 & 6) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3 text-xs">
            {/* Discount Module (Requirement 3) */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-brand-600" />
                Apply Discount:
              </span>

              <div className="flex items-center gap-1">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                >
                  <option value="none">No Discount</option>
                  <option value="percentage">% Percentage</option>
                  <option value="fixed">₹ Fixed Amount</option>
                </select>

                {discountType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    placeholder="Val"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-bold"
                  />
                )}
              </div>
            </div>

            {/* Rack / Shelf Location */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-brand-600" />
                Rack / Hanger Location:
              </span>
              <input
                type="text"
                placeholder="e.g. RACK-B4"
                value={rackLocation}
                onChange={(e) => setRackLocation(e.target.value)}
                className="w-28 uppercase bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-mono font-bold"
              />
            </div>
          </div>

          {/* Payment & Totals */}
          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-bold">₹{subtotal}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount Deduction:</span>
                <span>- ₹{discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
              <span className="font-extrabold text-slate-900 text-sm">Net Payable Total:</span>
              <span className="font-black text-xl text-brand-700">₹{grandTotal}/-</span>
            </div>

            {/* Advance payment collection */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Paid Advance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  placeholder="₹ 0"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="cash">Cash Counter</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Card POS</option>
                </select>
              </div>
            </div>

            {balanceAmount > 0 && (
              <p className="text-right text-[11px] font-bold text-amber-600">
                Balance Remaining: ₹{balanceAmount}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>Generating Invoice...</span>
            ) : (
              <>
                <span>Create Order & Generate Invoices</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
      {/* Add New Garment to Catalog Modal */}
      {showNewGarmentModal && (
        <div className="fixed inset-0 overflow-hidden overscroll-none bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Add New Garment to Catalog</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewGarmentModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGarment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Garment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silk Designer Saree / Woolen Blazer"
                  value={newGarment.name}
                  onChange={(e) => setNewGarment({ ...newGarment, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                    Category *
                  </label>
                  <select
                    value={newGarment.category}
                    onChange={(e) => setNewGarment({ ...newGarment, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden"
                  >
                    <option value="mens">Men&apos;s</option>
                    <option value="womens">Women&apos;s</option>
                    <option value="home">Home &amp; Furnishing</option>
                    <option value="laundry">Laundry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                    Billing Unit *
                  </label>
                  <select
                    value={newGarment.unit}
                    onChange={(e) => setNewGarment({ ...newGarment, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden"
                  >
                    <option value="piece">Piece</option>
                    <option value="pair">Pair</option>
                    <option value="per panel">Per Panel</option>
                    <option value="per sq ft">Per Sq. Ft.</option>
                    <option value="kg">Per Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                    Dry Clean Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newGarment.dryCleanRate}
                    onChange={(e) =>
                      setNewGarment({ ...newGarment, dryCleanRate: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                    Steam Press Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newGarment.steamIronRate}
                    onChange={(e) =>
                      setNewGarment({ ...newGarment, steamIronRate: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewGarmentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-900/20"
                >
                  Add to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
