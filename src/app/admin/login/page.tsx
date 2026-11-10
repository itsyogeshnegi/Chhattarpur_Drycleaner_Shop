'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();

  const [userId, setUserId] = useState('alharam_admin');
  const [password, setPassword] = useState('AlHaram@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch dynamic SVG CAPTCHA
  const refreshCaptcha = async () => {
    setLoadingCaptcha(true);
    setCaptchaInput('');
    try {
      const res = await fetch('/api/auth/captcha', { cache: 'no-store' });
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
          userId: userId.trim(),
          password,
          captchaCode: captchaInput.trim(),
          captchaToken,
        }),
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = '/admin/counter';
      } else {
        setError(data.message || 'Invalid User ID or password. Please try again.');
        refreshCaptcha();
      }
    } catch {
      setError('Connection error. Please try again.');
      refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setUserId('alharam_admin');
    setPassword('AlHaram@2026');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 overflow-y-auto relative selection:bg-brand-600 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl my-auto space-y-5 animate-scale-up z-10">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/25">
            <svg
              className="w-6 h-6 stroke-white fill-none stroke-[2.2]"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5c0 .7.3 1.3.8 1.8L2.7 13.5A2 2 0 0 0 4.2 17h15.6a2 2 0 0 0 1.5-3.5L13.7 7.3c.5-.5.8-1.1.8-1.8A2.5 2.5 0 0 0 12 3z" />
              <path d="M4 17h16" />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            AL-HARAM CMS
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Counter POS &amp; Management Portal
          </p>
        </div>

        {/* Quick Demo Credentials Info Pill */}
        <div className="p-3 bg-brand-950/40 border border-brand-800/60 rounded-2xl flex items-center justify-between text-xs text-brand-200">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-400 shrink-0" />
            <div className="text-[11px]">
              <span className="font-bold text-white">Default Admin:</span>
              <p className="text-slate-400">alharam_admin &bull; AlHaram@2026</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            className="text-[10px] uppercase font-bold bg-brand-600/40 hover:bg-brand-600 text-white px-2.5 py-1 rounded-lg border border-brand-500/50 transition shrink-0"
          >
            Auto-Fill
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-200 rounded-xl text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          {/* User ID */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              User ID / Username
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 absolute left-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="alharam_admin or admin"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              />
            </div>
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 absolute left-3.5 text-slate-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="AlHaram@2026"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-200 focus:outline-none p-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* CAPTCHA Verification */}
          <div className="pt-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Security CAPTCHA
              </label>
              <button
                type="button"
                onClick={refreshCaptcha}
                disabled={loadingCaptcha}
                className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 transition focus:outline-none"
              >
                <RefreshCw className={`w-3 h-3 ${loadingCaptcha ? 'animate-spin' : ''}`} />
                <span>Reload Code</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Render server-generated SVG */}
              <div
                className="h-11 border border-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-950 shadow-inner select-none"
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
              />

              <input
                type="text"
                required
                maxLength={6}
                placeholder="Enter 4 letters"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                className="w-full uppercase font-mono tracking-widest text-center py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-500 active:scale-98 text-white font-extrabold py-3.5 rounded-xl transition shadow-lg shadow-brand-600/30 text-sm flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
          >
            {submitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="pt-3 border-t border-slate-800/80 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1 font-semibold"
          >
            &larr; Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}
