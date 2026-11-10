import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { verifyMathCaptcha } from '@/lib/mathCaptcha';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, password, captchaAnswer, captchaToken } = body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Please enter your full name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid WhatsApp / mobile number.' },
        { status: 400 }
      );
    }

    const cleanDigits = phone.replace(/\D/g, '');
    const cleanPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address format.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // 2. Human Verification Math CAPTCHA
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

    // 3. Check for existing customer/user
    const existing = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { email: normalizedEmail },
        { userId: cleanPhone },
      ],
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          code: 'USER_EXISTS',
          message:
            'An account with this phone number or email already exists. Please sign in instead.',
        },
        { status: 409 }
      );
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Create new Customer user
    const newUser = await User.create({
      userId: cleanPhone,
      name: name.trim(),
      passwordHash,
      role: 'customer',
      phone: cleanPhone,
      email: normalizedEmail,
      isActive: true,
    });

    // 6. Sign JWT
    const token = signToken({
      userId: newUser.userId,
      name: newUser.name,
      role: newUser.role,
      phone: newUser.phone,
      email: newUser.email,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! Welcome to Al-Haram Dry Cleaners.',
        user: {
          userId: newUser.userId,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
          email: newUser.email,
        },
      },
      { status: 201 }
    );

    // 7. Set HTTP-only Cookie
    response.cookies.set('alharam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

