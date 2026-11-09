import { NextResponse } from 'next/server';
import { generateCaptcha } from '@/lib/captcha';

export async function GET() {
  try {
    const captcha = generateCaptcha();
    return NextResponse.json({
      success: true,
      svg: captcha.svg,
      token: captcha.token,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

