import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, isDatabaseConnectionError } from '@/lib/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signToken } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`reset-pwd:${ip}`, 10, 10 * 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(
        'Too many attempts. Please wait a few minutes before trying again.',
        limit.retryAfterSeconds
      );
    }

    const { resetToken, newPassword } = await req.json();

    if (!resetToken || typeof resetToken !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing verification session token.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Verify reset token
    let decoded: { userId: string; purpose: string };
    try {
      decoded = jwt.verify(
        resetToken,
        process.env.JWT_SECRET || 'al_haram_fallback_secret_2026'
      ) as { userId: string; purpose: string };
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Password reset session has expired or is invalid. Please start again.',
        },
        { status: 401 }
      );
    }

    if (decoded.purpose !== 'password_reset_verified' || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized reset request.' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ userId: decoded.userId });
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Customer account not found or disabled.' },
        { status: 404 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    console.log(`[Reset Password] Successfully updated password for user ${user.userId} (${user.email})`);

    // Automatically authenticate the customer so they don't have to log in again
    const token = signToken({
      userId: user.userId,
      name: user.name,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successfully! Welcome back to Al-Haram Drycleaners.',
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
      },
    });

    response.cookies.set('alharam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { success: false, message: 'Database connection issue. Please try again shortly.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}

