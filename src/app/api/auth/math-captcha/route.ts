import { NextResponse } from 'next/server';
import { generateMathCaptcha } from '@/lib/mathCaptcha';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const challenge = generateMathCaptcha();
    return NextResponse.json({
      success: true,
      question: challenge.question,
      num1: challenge.num1,
      op: challenge.op,
      num2: challenge.num2,
      token: challenge.token,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

