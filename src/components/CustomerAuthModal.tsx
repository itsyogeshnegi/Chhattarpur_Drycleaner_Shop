'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCustomerAuth, CustomerUser } from '@/context/CustomerAuthContext';
import { normalizeIndianPhone, sanitizePhoneInput } from '@/lib/phone';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  X,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CaptchaState {
  question: string;
  num1: number;
  op: '+' | '-';
  num2: number;
  token: string;
}

interface CustomerAuthModalProps {
  onSuccess?: (user: CustomerUser) => void;
}

export default function CustomerAuthModal({ onSuccess }: CustomerAuthModalProps) {
  const { isAuthModalOpen, authModalMode, closeAuthModal, setCustomer } = useCustomerAuth();

  useBodyScrollLock(isAuthModalOpen);

  const [mode, setMode] = useState<'register' | 'login'>(authModalMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Math CAPTCHA State
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Clear all form inputs, errors, and messages
  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setLoginIdentifier('');
    setLoginPassword('');
    setCaptchaAnswer('');
    setError(null);
    setSuccessMsg(null);
    setShowPassword(false);
  }, []);

  // Handler for closing modal that always cleans data
  const handleClose = useCallback(() => {
    resetForm();
    closeAuthModal();
  }, [closeAuthModal, resetForm]);

  // Sync mode with context
  useEffect(() => {
    setMode(authModalMode);
  }, [authModalMode]);

  // Fetch a new Math CAPTCHA
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaAnswer('');
    try {
      const res = await fetch('/api/auth/math-captcha', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setCaptcha({
          question: data.question,
          num1: data.num1,
          op: data.op,
          num2: data.num2,
          token: data.token,
        });
      }
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // When modal opens, completely reset fields and fetch fresh CAPTCHA; when closed, clean data
  useEffect(() => {
    if (isAuthModalOpen) {
      resetForm();
      fetchCaptcha();
    } else {
      resetForm();
    }
  }, [isAuthModalOpen, fetchCaptcha, resetForm]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, handleClose]);

  if (!isAuthModalOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = normalizeIndianPhone(phone);
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!captchaAnswer.trim() || !captcha?.token) {
      setError('Please solve the human verification math problem.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          email: email.trim().toLowerCase(),
          password,
          captchaAnswer: captchaAnswer.trim(),
          captchaToken: captcha.token,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setCustomer(data.user);
        setSuccessMsg('Account created successfully! Auto-filling your booking...');
        if (onSuccess) onSuccess(data.user);
        // Clear all input data upon successful submission
        setTimeout(() => {
          resetForm();
          closeAuthModal();
        }, 700);
      } else {
        setError(data.message || 'Registration failed');
        setCaptchaAnswer('');
        fetchCaptcha();
      }
    } catch {
      setError('Connection error. Please try again.');
      setCaptchaAnswer('');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim()) {
      setError('Please enter your phone number or email.');
      return;
    }

    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    if (!captchaAnswer.trim() || !captcha?.token) {
      setError('Please solve the human verification math problem.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
          captchaAnswer: captchaAnswer.trim(),
          captchaToken: captcha.token,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setCustomer(data.user);
        setSuccessMsg(`Welcome back, ${data.user.name}! Auto-filling booking...`);
        if (onSuccess) onSuccess(data.user);
        // Clear all input data upon successful submission
        setTimeout(() => {
          resetForm();
          closeAuthModal();
        }, 700);
      } else {
        setError(data.message || 'Login failed. Please check credentials.');
        setCaptchaAnswer('');
        fetchCaptcha();
      }
    } catch {
      setError('Connection error. Please try again.');
      setCaptchaAnswer('');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Outer Scroll Wrapper to ensure modal is never clipped on any screen height */
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 md:p-6 transition-opacity animate-fade-in"
      onClick={handleClose}
    >
      <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
        {/* Modal Dialog Card */}
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Banner */}
          <div className="relative bg-gradient-to-r from-brand-600 via-brand-700 to-sky-700 px-4 py-3.5 sm:px-6 sm:py-4 text-white">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition focus:outline-none"
              aria-label="Close popup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-wider text-sky-100">
                AL-HARAM DRYCLEANERS &bull; CHATTARPUR
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {mode === 'register' ? 'Create Customer Account' : 'Customer Sign In'}
            </h3>
            <p className="text-[11px] sm:text-xs text-sky-100/90 mt-0.5 max-w-sm">
              Required before booking your free doorstep pickup so you can track clothes in real-time.
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 border-b border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                resetForm();
                fetchCaptcha();
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-brand-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create New Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                resetForm();
                fetchCaptcha();
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-brand-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In to Existing
            </button>
          </div>

          {/* Modal Form Content */}
          <div className="p-4 sm:p-6 space-y-3">
            {/* Feedback Alerts */}
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-semibold leading-tight">{successMsg}</span>
              </div>
            )}

            {mode === 'register' ? (
              /* CREATE ACCOUNT FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* 2-Column Responsive Grid on screens >= 480px */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-brand-600" />
                      <span>Full Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  </div>

                  {/* WhatsApp / Mobile Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-brand-600" />
                      <span>Mobile Number *</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-[11px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                        className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition font-medium"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-brand-600" />
                      <span>Email Address *</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-brand-600" />
                      <span>Password *</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Min 6 chars"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* HUMAN VERIFICATION MATH CAPTCHA (CLEAN & CLEAR COMPACT BOX) */}
                <div className="p-3 bg-gradient-to-r from-sky-50/80 via-blue-50/60 to-amber-50/80 border border-brand-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                        Human Verification CAPTCHA
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      title="Load new math question"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 hover:text-brand-900 bg-white px-2 py-0.5 rounded border border-brand-200 shadow-2xs hover:bg-slate-50 transition"
                    >
                      <RotateCcw className={`w-3 h-3 ${captchaLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Math Challenge Display */}
                    <div className="bg-slate-950 text-white font-mono font-black text-base sm:text-lg px-3.5 py-1.5 rounded-lg shadow-inner tracking-wider select-none shrink-0 flex items-center gap-1.5 border border-slate-700">
                      <span>{captcha ? captcha.question : '...'}</span>
                      <span className="text-amber-400">=</span>
                      <span className="text-brand-400">?</span>
                    </div>

                    {/* Answer Input without number spinner arrows */}
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Calculator className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        placeholder="Right value"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-brand-300 rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <span>Create Account &amp; Proceed to Booking</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      resetForm();
                      fetchCaptcha();
                    }}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                  >
                    Already have an account? Sign in here
                  </button>
                </div>
              </form>
            ) : (
              /* SIGN IN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {/* Identifier */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-brand-600" />
                      <span>Mobile or Email *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="10-digit mobile or email"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-brand-600" />
                      <span>Password *</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Math CAPTCHA for Login */}
                <div className="p-3 bg-gradient-to-r from-sky-50/80 via-blue-50/60 to-amber-50/80 border border-brand-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                        Human Verification
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      title="Load new math question"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 hover:text-brand-900 bg-white px-2 py-0.5 rounded border border-brand-200 shadow-2xs hover:bg-slate-50 transition"
                    >
                      <RotateCcw className={`w-3 h-3 ${captchaLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="bg-slate-950 text-white font-mono font-black text-base sm:text-lg px-3.5 py-1.5 rounded-lg shadow-inner tracking-wider select-none shrink-0 flex items-center gap-1.5 border border-slate-700">
                      <span>{captcha ? captcha.question : '...'}</span>
                      <span className="text-amber-400">=</span>
                      <span className="text-brand-400">?</span>
                    </div>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Calculator className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        placeholder="Right value"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-brand-300 rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In &amp; Continue Booking</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      resetForm();
                      fetchCaptcha();
                    }}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                  >
                    Need an account? Create one in 30 seconds
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
