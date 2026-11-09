import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { verifyCaptcha } from '@/lib/captcha';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId, password, captchaCode, captchaToken } = await req.json();

    if (!userId || !password) {
      return NextResponse.json({ success: false, message: 'User ID and password are required' }, { status: 400 });
    }

    // Verify CAPTCHA (Requirement 1)
    if (!captchaCode || !captchaToken || !verifyCaptcha(captchaCode, captchaToken)) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired CAPTCHA code. Please try again.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedUserId = userId.trim().toLowerCase();
    const user = await User.findOne({ userId: normalizedUserId });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials or account disabled' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid User ID or password' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = signToken({
      userId: user.userId,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set('alharam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

