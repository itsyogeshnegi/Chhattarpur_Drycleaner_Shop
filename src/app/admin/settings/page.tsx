'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Phone,
  MessageSquare,
  Percent,
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    storeName: "AL-HARAM Drycleaner's And Launderettes",
    tagline: 'Premium Dry Cleaning, Steam Pressing & Fabric Care in Chattarpur',
    address: 'A-1/67, Birla Farm Colony, Chattarpur, New Delhi-110074',
    phone1: '+91 87005 48416',
    phone2: '+91 88513 07434',
    whatsappNumber: '918700548416',
    email: 'contact@alharamdrycleaners.com',
    invoicePrefix: 'AHDC',
    defaultTaxRate: 0,
    maxDiscountPercentage: 30,
    termsAndConditions: [
      'Please inspect clothes at the time of delivery.',
      'We take utmost care with all garments; however, manufacturer color-run is not warranted.',
      'Deliveries must be collected within 30 days of completion.',
      'Dry cleaning & steam press tariff subject to fabric condition.',
    ],
    openingHours: 'Monday - Sunday: 9:00 AM – 9:00 PM',
    razorpayMeUrl: 'https://razorpay.me/@ashiyaalharamdrycleaner',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings?fresh=1', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            razorpayMeUrl: data.settings.razorpayMeUrl || prev.razorpayMeUrl,
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Settings updated successfully! Changes applied immediately across website and POS invoices.');
      } else {
        setErrorMsg(data.message || 'Failed to save settings');
      }
    } catch {
      setErrorMsg('Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading customisation panel...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs uppercase font-extrabold text-brand-700 tracking-wider">
            Requirement 9: System Configuration
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Full Customisation Hub</h1>
          <p className="text-xs text-slate-500">
            Control shop identity, contact details, invoice numbering prefix, tax rules, and legal terms in real-time.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Store className="w-5 h-5 text-brand-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">Store Profile & Branding</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Store Business Name
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Store Tagline / Slogan
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Chattarpur Store Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Primary Phone
              </label>
              <input
                type="text"
                value={settings.phone1}
                onChange={(e) => setSettings({ ...settings, phone1: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Secondary Phone
              </label>
              <input
                type="text"
                value={settings.phone2}
                onChange={(e) => setSettings({ ...settings, phone2: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                WhatsApp Dispatch Mobile (91...)
              </label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Operating Hours
              </label>
              <input
                type="text"
                value={settings.openingHours}
                onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Invoice & Tax Settings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Percent className="w-5 h-5 text-brand-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">Invoice Numbering & Tax Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase"
              />
              <p className="text-[10px] text-slate-400 mt-1">e.g. AHDC-2026-0042</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="28"
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Set to 0 for net pricing</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                Max Allowable Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={settings.maxDiscountPercentage}
                onChange={(e) =>
                  setSettings({ ...settings, maxDiscountPercentage: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Counter discount ceiling</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black text-sm py-3.5 rounded-xl shadow-md transition flex items-center justify-center gap-2"
        >
          {saving ? (
            <span>Saving Settings...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save System Customisations</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

