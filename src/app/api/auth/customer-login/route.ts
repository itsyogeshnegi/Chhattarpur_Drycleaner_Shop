import { NextRequest, NextResponse } from 'next/server';
import { normalizeIndianPhone } from '@/lib/phone';
import { connectToDatabase, isDatabaseConnectionError } from '@/lib/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { verifyMathCaptcha } from '@/lib/mathCaptcha';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password, captchaAnswer, captchaToken } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide your registered phone number or email, and password.' },
        { status: 400 }
      );
    }

    // Human verification check
    const captchaCheck = verifyMathCaptcha(captchaAnswer, captchaToken);
    if (!captchaCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          message: captchaCheck.reason || 'Human verification failed. Please try again.',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const cleanInput = String(identifier).trim().toLowerCase();
    const cleanPhone = normalizeIndianPhone(identifier);

    // Find customer by phone, email, or userId
    const user = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { email: cleanInput },
        { userId: cleanInput },
        { userId: cleanPhone },
      ],
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials or account disabled' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.userId,
      name: user.name,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
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
    console.error('Customer login error:', error);
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { success: false, message: 'Unable to connect to the database right now. Please try again in a moment.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: false, message: 'Login failed. Please try again.' }, { status: 500 });
  }
}

