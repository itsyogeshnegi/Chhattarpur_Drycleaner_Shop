import crypto from 'crypto';

const CAPTCHA_SECRET =
  process.env.JWT_SECRET || 'al_haram_super_secure_jwt_secret_chattarpur_2026_9837264';

export interface MathCaptchaChallenge {
  question: string;
  num1: number;
  op: '+' | '-';
  num2: number;
  token: string;
}

export interface CaptchaVerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * Generates a human verification math challenge with 2 numbers and addition (+) or subtraction (-).
 * Subtraction always produces a positive integer result (num1 > num2).
 * The answer is never exposed in the client token; only an HMAC digest with salt & timestamp.
 */
export function generateMathCaptcha(): MathCaptchaChallenge {
  const isAddition = Math.random() < 0.5;
  const op: '+' | '-' = isAddition ? '+' : '-';

  let num1: number;
  let num2: number;
  let answer: number;

  if (isAddition) {
    // Addition: e.g. 14 + 7
    num1 = Math.floor(Math.random() * 20) + 3; // 3 to 22
    num2 = Math.floor(Math.random() * 15) + 2; // 2 to 16
    answer = num1 + num2;
  } else {
    // Subtraction: e.g. 24 - 9 (always positive, num1 > num2)
    num1 = Math.floor(Math.random() * 25) + 12; // 12 to 36
    num2 = Math.floor(Math.random() * (num1 - 4)) + 2; // 2 to num1 - 3
    answer = num1 - num2;
  }

  const timestamp = Date.now();
  const salt = crypto.randomBytes(8).toString('hex');

  const hmac = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${answer}:${timestamp}:${salt}`)
    .digest('hex');

  const token = `${timestamp}.${salt}.${hmac}`;

  return {
    question: `${num1} ${op} ${num2}`,
    num1,
    op,
    num2,
    token,
  };
}

/**
 * Validates the user's submitted calculation answer against the signed token.
 * Token validity is 10 minutes.
 */
export function verifyMathCaptcha(
  userAnswer: string | number | undefined,
  token: string | undefined
): CaptchaVerifyResult {
  if (userAnswer === undefined || userAnswer === null || String(userAnswer).trim() === '') {
    return { valid: false, reason: 'Please solve the math verification to continue' };
  }

  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing human verification token. Please refresh.' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Invalid verification token format' };
  }

  const [timestampStr, salt, expectedHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false, reason: 'Corrupted verification token timestamp' };
  }

  const now = Date.now();
  // Valid for 10 minutes (600,000 ms)
  if (now - timestamp > 10 * 60 * 1000) {
    return { valid: false, reason: 'Verification challenge expired. Please click refresh.' };
  }

  // Reject timestamps in the far future (> 60s skew)
  if (timestamp > now + 60 * 1000) {
    return { valid: false, reason: 'Invalid verification token clock skew' };
  }

  const parsedAnswer = parseInt(String(userAnswer).trim(), 10);
  if (isNaN(parsedAnswer)) {
    return { valid: false, reason: 'Please enter a valid whole number for the answer' };
  }

  const calculatedHmac = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${parsedAnswer}:${timestampStr}:${salt}`)
    .digest('hex');

  try {
    const bufExpected = Buffer.from(expectedHmac, 'hex');
    const bufCalculated = Buffer.from(calculatedHmac, 'hex');

    if (
      bufExpected.length === 0 ||
      bufExpected.length !== bufCalculated.length ||
      !crypto.timingSafeEqual(bufExpected, bufCalculated)
    ) {
      return {
        valid: false,
        reason: 'Incorrect verification answer. Please calculate the numbers again.',
      };
    }
  } catch {
    return { valid: false, reason: 'Failed to verify human challenge signature' };
  }

  return { valid: true };
}

