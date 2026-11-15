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
  ArrowLeft,
  Sparkles,
  KeyRound,
  MailCheck,
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

type ModalMode = 'register' | 'login' | 'forgot_request' | 'forgot_otp' | 'forgot_new_password';

export default function CustomerAuthModal({ onSuccess }: CustomerAuthModalProps) {
  const { isAuthModalOpen, authModalMode, closeAuthModal, setCustomer } = useCustomerAuth();

  useBodyScrollLock(isAuthModalOpen);

  const [mode, setMode] = useState<ModalMode>(
    authModalMode === 'forgot' ? 'forgot_request' : authModalMode
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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

  // Forgot Password Fields
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Math CAPTCHA State (used only for Sign Up)
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clear all form inputs, errors, and messages
  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setLoginIdentifier('');
    setLoginPassword('');
    setForgotIdentifier('');
    setForgotMaskedEmail('');
    setForgotOtp('');
    setForgotResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setCaptchaAnswer('');
    setError(null);
    setSuccessMsg(null);
    setShowPassword(false);
    setShowNewPassword(false);
    setResendCooldown(0);
  }, []);

  // Handler for closing modal that always cleans data and restores base mode
  const handleClose = useCallback(() => {
    resetForm();
    setMode(authModalMode === 'forgot' ? 'forgot_request' : authModalMode);
    closeAuthModal();
  }, [closeAuthModal, resetForm, authModalMode]);

  // Sync mode and reset fields whenever modal opens or context authModalMode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode === 'forgot' ? 'forgot_request' : authModalMode);
    }
    resetForm();
  }, [isAuthModalOpen, authModalMode, resetForm]);

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

  // Load math CAPTCHA only when Sign Up mode is active
  useEffect(() => {
    if (isAuthModalOpen && mode === 'register') {
      fetchCaptcha();
    }
  }, [isAuthModalOpen, mode, fetchCaptcha]);

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

    setLoading(true);

    try {
      const res = await fetch('/api/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setCustomer(data.user);
        setSuccessMsg(`Welcome back, ${data.user.name}! Auto-filling booking...`);
        if (onSuccess) onSuccess(data.user);
        setTimeout(() => {
          resetForm();
          closeAuthModal();
        }, 700);
      } else {
        setError(data.message || 'Login failed. Please check credentials.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const target = forgotIdentifier.trim();
    if (!target) {
      setError('Please enter your registered Gmail or email address.');
      return;
    }

    if (!target.includes('@') || !target.includes('.')) {
      setError('Please provide a valid Gmail or Email address (e.g. name@gmail.com). Mobile numbers are not accepted.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target, identifier: target }),
      });
      const data = await res.json();

      if (data.success) {
        setForgotMaskedEmail(data.maskedEmail || target);
        setSuccessMsg(data.message);
        setResendCooldown(45);
        setMode('forgot_otp');
      } else {
        setError(data.message || 'Unable to send reset OTP. Please check your credentials.');
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP received on your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotIdentifier.trim(),
          identifier: forgotIdentifier.trim(),
          otp: cleanOtp,
        }),
      });
      const data = await res.json();

      if (data.success && data.resetToken) {
        setForgotResetToken(data.resetToken);
        setSuccessMsg('Email OTP verified! Please set your new password.');
        setMode('forgot_new_password');
      } else {
        setError(data.message || 'Invalid or expired OTP. Please try again.');
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken: forgotResetToken,
          newPassword,
        }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setCustomer(data.user);
        setSuccessMsg('Password reset successfully! Welcome back.');
        if (onSuccess) onSuccess(data.user);
        setTimeout(() => {
          resetForm();
          closeAuthModal();
        }, 1200);
      } else {
        setError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isForgotMode = mode.startsWith('forgot_');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 md:p-6 transition-opacity animate-fade-in"
      onClick={handleClose}
    >
      <div className="min-h-full flex items-center justify-center py-2 sm:py-6">
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Banner */}
          <div className="relative bg-gradient-to-r from-brand-600 via-brand-700 to-sky-700 px-4 py-3.5 sm:px-6 sm:py-4 text-white">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition focus:outline-none cursor-pointer"
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
              {mode === 'register'
                ? 'Create Customer Account'
                : mode === 'login'
                ? 'Customer Sign In'
                : mode === 'forgot_request'
                ? 'Reset Your Password'
                : mode === 'forgot_otp'
                ? 'Verify Email OTP'
                : 'Set New Password'}
            </h3>
            <p className="text-[11px] sm:text-xs text-sky-100/90 mt-0.5 max-w-sm">
              {!isForgotMode
                ? 'Required before booking your free doorstep pickup so you can track clothes in real-time.'
                : mode === 'forgot_request'
                ? 'We will send a 6-digit OTP verification code to your registered email via Resend.'
                : mode === 'forgot_otp'
                ? `Enter the 6-digit verification code sent to ${forgotMaskedEmail || 'your email'}.`
                : 'Create a new, strong password with at least 6 characters.'}
            </p>
          </div>

          {/* Mode Switch Tabs or Breadcrumb */}
          {!isForgotMode ? (
            <div className="grid grid-cols-2 p-1 bg-slate-100 border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  resetForm();
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
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
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-brand-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In to Existing
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  resetForm();
                }}
                className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {mode === 'forgot_request'
                  ? 'Step 1: Request OTP'
                  : mode === 'forgot_otp'
                  ? 'Step 2: Verify Code'
                  : 'Step 3: New Password'}
              </span>
            </div>
          )}

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

            {/* 1. REGISTRATION FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* HUMAN VERIFICATION MATH CAPTCHA */}
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
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 hover:text-brand-900 bg-white px-2 py-0.5 rounded border border-brand-200 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                    }}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline cursor-pointer"
                  >
                    Already have an account? Sign in here
                  </button>
                </div>
              </form>
            )}

            {/* 2. SIGN IN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-brand-600" />
                        <span>Password *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_request');
                          setError(null);
                          setSuccessMsg(null);
                          if (loginIdentifier.trim().includes('@')) {
                            setForgotIdentifier(loginIdentifier.trim());
                          } else {
                            setForgotIdentifier('');
                          }
                        }}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-800 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
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
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                    }}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline cursor-pointer"
                  >
                    Need an account? Sign up
                  </button>
                </div>
              </form>
            )}

            {/* 3. FORGOT PASSWORD - STEP 1: REQUEST OTP */}
            {mode === 'forgot_request' && (
              <form onSubmit={handleForgotPasswordRequest} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-brand-600" />
                    <span>Registered Gmail / Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@gmail.com"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition font-medium"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    We will send a 6-digit OTP verification code to your registered Gmail address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Sending OTP via Resend...</span>
                  ) : (
                    <>
                      <span>Send 6-Digit Reset Code</span>
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
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Remember your password? Sign in instead
                  </button>
                </div>
              </form>
            )}

            {/* 4. FORGOT PASSWORD - STEP 2: VERIFY OTP */}
            {mode === 'forgot_otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-sky-800">
                    <MailCheck className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Code Dispatched to {forgotMaskedEmail}</span>
                  </div>
                  <p className="text-[11px] text-sky-700 leading-relaxed">
                    Check your email inbox (and spam folder) for the 6-digit verification code. It is valid for 10 minutes.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                      <span>Enter 6-Digit OTP *</span>
                    </label>
                    {resendCooldown > 0 ? (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleForgotPasswordRequest()}
                        disabled={loading}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-800 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="• • • • • •"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center font-mono font-black text-2xl tracking-[8px] py-2.5 bg-slate-50 border-2 border-brand-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || forgotOtp.trim().length !== 6}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Verifying Code...</span>
                  ) : (
                    <>
                      <span>Verify Code &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_request');
                      setForgotOtp('');
                      setError(null);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Wrong Gmail address? Change email
                  </button>
                </div>
              </form>
            )}

            {/* 5. FORGOT PASSWORD - STEP 3: SET NEW PASSWORD */}
            {mode === 'forgot_new_password' && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Email verified! Now set your secure new password.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-brand-600" />
                      <span>New Password *</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Min 6 chars"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-brand-600" />
                      <span>Confirm Password *</span>
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <span>Save New Password &amp; Sign In</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
