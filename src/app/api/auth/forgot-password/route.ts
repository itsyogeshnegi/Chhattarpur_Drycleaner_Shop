import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, isDatabaseConnectionError } from '@/lib/db';
import { User } from '@/models/User';
import { sendPasswordResetOtpEmail } from '@/lib/resend';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const start = local.slice(0, 2);
  const end = local.slice(-2);
  const maskedMiddle = '*'.repeat(Math.min(6, Math.max(2, local.length - 4)));
  return `${start}${maskedMiddle}${end}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`customer-forgot-pwd:${ip}`, 6, 10 * 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(
        'Too many password reset requests. Please wait a few minutes before trying again.',
        limit.retryAfterSeconds
      );
    }

    const body = await req.json();
    const rawEmail = (body.email || body.identifier || '').toString().trim().toLowerCase();

    if (!rawEmail) {
      return NextResponse.json(
        { success: false, message: 'Please enter your registered Gmail / Email address.' },
        { status: 400 }
      );
    }

    // Strictly enforce valid email format (no phone numbers accepted)
    if (!rawEmail.includes('@') || !rawEmail.includes('.')) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid Gmail or Email address (e.g. name@gmail.com). Mobile numbers are not accepted for email reset.',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find customer strictly by email
    const user = await User.findOne({ email: rawEmail });

    if (!user || !user.isActive || !user.email) {
      return NextResponse.json(
        {
          success: false,
          message: 'No registered customer account found matching this Gmail / Email address.',
        },
        { status: 404 }
      );
    }

    const customerEmail: string = user.email;

    // Daily limit: Maximum 2 password reset OTP requests per user per 24 hours (1 day).
    // If 2 attempts have already been made, strictly DO NOT call the Resend API.
    const MAX_DAILY_RESETS = 2;
    const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = new Date();

    const windowStart = user.resetPasswordDailyWindowStart
      ? new Date(user.resetPasswordDailyWindowStart)
      : null;

    const isWindowActive =
      windowStart !== null && now.getTime() - windowStart.getTime() < WINDOW_DURATION_MS;

    const currentAttempts = isWindowActive ? (user.resetPasswordDailyAttempts || 0) : 0;

    // Strict condition: Block any request beyond 2 attempts and prevent calling Resend API
    if (currentAttempts >= MAX_DAILY_RESETS) {
      const resetTime = windowStart
        ? new Date(windowStart.getTime() + WINDOW_DURATION_MS)
        : new Date(now.getTime() + WINDOW_DURATION_MS);
      const remainingMs = Math.max(0, resetTime.getTime() - now.getTime());
      const hoursRemaining = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));

      console.warn(
        `[Forgot Password Blocked] User ${user.userId} (${customerEmail}) exceeded daily limit of ${MAX_DAILY_RESETS} attempts (${currentAttempts} used). Resend API was NOT called.`
      );

      return NextResponse.json(
        {
          success: false,
          limitReached: true,
          remainingAttempts: 0,
          message: `Daily limit reached. You can only request a password reset OTP 2 times in 24 hours. Please try again in approximately ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} or contact store support.`,
        },
        { status: 429 }
      );
    }

    const newAttemptCount = isWindowActive ? currentAttempts + 1 : 1;
    const remainingAttemptsAfterThis = Math.max(0, MAX_DAILY_RESETS - newAttemptCount);

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expiry;
    user.resetPasswordDailyAttempts = newAttemptCount;
    if (!isWindowActive) {
      user.resetPasswordDailyWindowStart = now;
    }
    await user.save();

    console.log(
      `[Forgot Password] Generated OTP for user ${user.userId} (${customerEmail}): ${otp} (Daily attempt: ${newAttemptCount}/${MAX_DAILY_RESETS})`
    );

    // Send email strictly via Resend to the customer's email
    const emailResult = await sendPasswordResetOtpEmail({
      to: customerEmail,
      name: user.name,
      otp,
    });

    const masked = maskEmail(customerEmail);
    const attemptNotice =
      remainingAttemptsAfterThis > 0
        ? `(${remainingAttemptsAfterThis} reset request remaining today)`
        : `(Daily limit reached: 2 of 2 used)`;

    if (!emailResult.success) {
      // In Resend test tier with onboarding@resend.dev, emails can only be sent to the verified account email.
      // If blocked by Resend domain restrictions, provide helpful feedback so testing isn't blocked.
      const isResendRestriction =
        emailResult.error &&
        (emailResult.error.toLowerCase().includes('testing email') ||
          emailResult.error.toLowerCase().includes('domain'));

      if (isResendRestriction) {
        return NextResponse.json({
          success: true,
          message: `OTP generated! (Resend sandbox notice: your test OTP is ${otp}). In production with a verified domain, this sends to ${masked}. ${attemptNotice}`,
          maskedEmail: masked,
          email: customerEmail,
          devOtp: otp,
          remainingAttempts: remainingAttemptsAfterThis,
          attemptsUsedToday: newAttemptCount,
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            emailResult.error ||
            'Failed to dispatch reset email. Please verify your connection or try again shortly.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit reset code has been sent to your Gmail (${masked}). ${attemptNotice}`,
      maskedEmail: masked,
      email: customerEmail,
      remainingAttempts: remainingAttemptsAfterThis,
      attemptsUsedToday: newAttemptCount,
    });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { success: false, message: 'Database connection issue. Please try again shortly.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to process password reset request. Please try again.' },
      { status: 500 }
    );
  }
}
