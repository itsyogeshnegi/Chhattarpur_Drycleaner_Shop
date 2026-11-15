import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { normalizeIndianPhone } from '@/lib/phone';
import bcrypt from 'bcryptjs';

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!['admin', 'counter_staff'].includes(adminUser.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('identifier')?.trim() || '';

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'Customer identifier (phone, email, or userId) is required.' },
        { status: 400 }
      );
    }

    const cleanPhone = normalizeIndianPhone(identifier);
    const rawLower = identifier.toLowerCase();

    const user = await User.findOne({
      role: 'customer',
      $or: [
        ...(cleanPhone ? [{ phone: cleanPhone }, { userId: cleanPhone }] : []),
        { email: rawLower },
        { userId: rawLower },
      ],
    }).select(
      'userId name phone email resetPasswordDailyAttempts resetPasswordDailyWindowStart passwordResetCount lastPasswordResetAt createdAt isActive'
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No registered customer account found for this identifier.' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const windowStart = user.resetPasswordDailyWindowStart
      ? new Date(user.resetPasswordDailyWindowStart).getTime()
      : null;
    const isWindowActive = windowStart !== null && now - windowStart < WINDOW_MS;
    const dailyAttempts = isWindowActive ? user.resetPasswordDailyAttempts || 0 : 0;
    const isDailyLimitReached = dailyAttempts >= 2;
    const remainingMs = windowStart ? Math.max(0, windowStart + WINDOW_MS - now) : 0;
    const hoursRemaining = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));

    return NextResponse.json({
      success: true,
      customer: {
        userId: user.userId,
        name: user.name,
        phone: user.phone || '',
        email: user.email || '',
        isActive: user.isActive,
        createdAt: user.createdAt,
        resetStats: {
          dailyAttempts,
          maxDailyAttempts: 2,
          isDailyLimitReached,
          hoursUntilWindowReset: hoursRemaining,
          totalResets: user.passwordResetCount || 0,
          lastResetAt: user.lastPasswordResetAt || null,
        },
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Customer Password GET Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve customer security details.', error: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!['admin', 'counter_staff'].includes(adminUser.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const identifier = (body.identifier || body.phone || body.email || '').toString().trim();
    const action = body.action || 'update_password'; // 'update_password' | 'unlock_daily_limit'
    const newPassword = (body.newPassword || '').toString().trim();
    const resetDailyAttempts = body.resetDailyAttempts !== false;

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'Customer identifier (phone or email) is required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const cleanPhone = normalizeIndianPhone(identifier);
    const rawLower = identifier.toLowerCase();

    const user = await User.findOne({
      role: 'customer',
      $or: [
        ...(cleanPhone ? [{ phone: cleanPhone }, { userId: cleanPhone }] : []),
        { email: rawLower },
        { userId: rawLower },
      ],
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Customer account not found in database.' },
        { status: 404 }
      );
    }

    // ACTION 1: Unlock daily limit only
    if (action === 'unlock_daily_limit') {
      user.resetPasswordDailyAttempts = 0;
      user.resetPasswordDailyWindowStart = undefined;
      await user.save();

      console.log(
        `[Admin Security] Admin (${adminUser.userId}) cleared daily OTP limit for customer ${user.userId} (${user.email || user.phone})`
      );

      return NextResponse.json({
        success: true,
        message: `Daily password reset limit has been successfully unlocked for ${user.name}. The customer can now request OTP again.`,
        resetStats: {
          dailyAttempts: 0,
          maxDailyAttempts: 2,
          isDailyLimitReached: false,
          hoursUntilWindowReset: 0,
          totalResets: user.passwordResetCount || 0,
          lastResetAt: user.lastPasswordResetAt || null,
        },
      });
    }

    // ACTION 2: Update customer password
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.passwordResetCount = (user.passwordResetCount || 0) + 1;
    user.lastPasswordResetAt = new Date();
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    if (resetDailyAttempts) {
      user.resetPasswordDailyAttempts = 0;
      user.resetPasswordDailyWindowStart = undefined;
    }

    await user.save();

    console.log(
      `[Admin Security] Admin (${adminUser.userId}) manually updated password for customer ${user.userId} (${user.email || user.phone}). Total resets: ${user.passwordResetCount}`
    );

    return NextResponse.json({
      success: true,
      message: `Password successfully updated for ${user.name}.`,
      customer: {
        userId: user.userId,
        name: user.name,
        phone: user.phone || '',
        email: user.email || '',
        resetStats: {
          dailyAttempts: user.resetPasswordDailyAttempts || 0,
          maxDailyAttempts: 2,
          isDailyLimitReached: false,
          hoursUntilWindowReset: 0,
          totalResets: user.passwordResetCount || 0,
          lastResetAt: user.lastPasswordResetAt,
        },
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Customer Password Update Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update customer password.', error: errorMsg },
      { status: 500 }
    );
  }
}

