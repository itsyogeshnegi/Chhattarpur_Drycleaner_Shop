import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, isDatabaseConnectionError } from '@/lib/db';
import { User } from '@/models/User';
import jwt from 'jsonwebtoken';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`verify-reset-otp:${ip}`, 10, 10 * 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(
        'Too many verification attempts. Please wait a few minutes before trying again.',
        limit.retryAfterSeconds
      );
    }

    const body = await req.json();
    const rawEmail = (body.email || body.identifier || '').toString().trim().toLowerCase();
    const otp = (body.otp || '').toString().trim();

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid registered Gmail / Email address.' },
        { status: 400 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { success: false, message: 'Please enter the valid 6-digit OTP received on your email.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find customer strictly by registered email
    const user = await User.findOne({ email: rawEmail });

    if (!user || !user.isActive || !user.email) {
      return NextResponse.json(
        { success: false, message: 'No registered customer account found with this Gmail / Email address.' },
        { status: 404 }
      );
    }

    const customerEmail: string = user.email;

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return NextResponse.json(
        {
          success: false,
          message: 'No active OTP verification found. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // Check expiry
    if (Date.now() > user.resetPasswordOtpExpires.getTime()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save();

      return NextResponse.json(
        {
          success: false,
          message: 'Your verification OTP has expired. Please request a fresh code.',
        },
        { status: 400 }
      );
    }

    // Check OTP match
    if (user.resetPasswordOtp !== otp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Incorrect 6-digit OTP. Please recheck your email or request a new code.',
        },
        { status: 400 }
      );
    }

    // OTP is valid! Invalidate the OTP so it cannot be reused
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    // Create a tamper-proof short-lived verification token (15 mins) for password change
    const resetToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        purpose: 'password_reset_verified',
      },
      process.env.JWT_SECRET || 'al_haram_fallback_secret_2026',
      { expiresIn: '15m' }
    );

    return NextResponse.json({
      success: true,
      message: 'Email OTP verified successfully! You can now set your new password.',
      resetToken,
      customerName: user.name,
      customerEmail,
    });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { success: false, message: 'Database connection issue. Please try again shortly.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
