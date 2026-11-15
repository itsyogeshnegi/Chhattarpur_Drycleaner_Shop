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

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expiry;
    await user.save();

    console.log(`[Forgot Password] Generated OTP for user ${user.userId} (${customerEmail}): ${otp}`);

    // Send email strictly via Resend to the customer's email
    const emailResult = await sendPasswordResetOtpEmail({
      to: customerEmail,
      name: user.name,
      otp,
    });

    const masked = maskEmail(customerEmail);

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
          message: `OTP generated! (Resend sandbox notice: your test OTP is ${otp}). In production with a verified domain, this sends to ${masked}.`,
          maskedEmail: masked,
          email: customerEmail,
          devOtp: otp,
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
      message: `A 6-digit reset code has been sent to your Gmail (${masked}). Please check your inbox and spam folder.`,
      maskedEmail: masked,
      email: customerEmail,
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
