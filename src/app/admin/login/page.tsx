'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, User, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch dynamic SVG CAPTCHA (Requirement 1)
  const refreshCaptcha = async () => {
    setLoadingCaptcha(true);
    setCaptchaInput('');
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (data.success) {
        setCaptchaSvg(data.svg);
        setCaptchaToken(data.token);
      }
    } catch {
      setError('Could not generate CAPTCHA. Please check server.');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          password,
          captchaCode: captchaInput,
          captchaToken,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/admin/counter');
        router.refresh();
      } else {
        setError(data.message || 'Login failed');
        refreshCaptcha(); // generate new CAPTCHA on failure
      }
    } catch {
      setError('Connection error. Please try again.');
      refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AL-HARAM CMS</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Counter POS & Management Portal
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* User ID */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              User ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="e.g. alharam_admin"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          {/* CAPTCHA Verification (Requirement 1) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Security CAPTCHA
              </label>
              <button
                type="button"
                onClick={refreshCaptcha}
                disabled={loadingCaptcha}
                className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loadingCaptcha ? 'animate-spin' : ''}`} />
                Reload Code
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Render server-generated SVG */}
              <div
                className="h-12 border border-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-900"
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
              />

              <input
                type="text"
                required
                maxLength={6}
                placeholder="Enter 4 letters"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                className="w-full uppercase font-mono tracking-widest text-center py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-brand-600/30 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
            &larr; Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}

