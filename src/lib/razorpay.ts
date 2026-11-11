import crypto from 'crypto';
import Razorpay from 'razorpay';

export const DEFAULT_RAZORPAY_ME_URL = 'https://razorpay.me/@ashiyaalharamdrycleaner';

export function getRazorpayMeBaseUrl(customUrl?: string): string {
  const url = (customUrl || process.env.NEXT_PUBLIC_RAZORPAY_ME_URL || DEFAULT_RAZORPAY_ME_URL).trim();
  // Razorpay V2 handles (razorpay.me/@handle) return 404 NOT_FOUND if /<amount> is appended
  return url.replace(/\/+$/, '').replace(/^(https?:\/\/razorpay\.me\/@[^/?#]+)\/.*$/i, '$1');
}

export function buildRazorpayMePayUrl(customUrl?: string): string {
  return getRazorpayMeBaseUrl(customUrl);
}

export function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return (
    Boolean(keyId) &&
    Boolean(keySecret) &&
    !keyId.includes('placeholder') &&
    !keySecret.includes('placeholder')
  );
}

export function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID || '';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay API keys are not configured.');
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!isRazorpayConfigured() || !orderId || !paymentId || !signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const genBuf = Buffer.from(generatedSignature, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');
  if (genBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(genBuf, sigBuf);
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!webhookSecret || webhookSecret.includes('placeholder') || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expBuf = Buffer.from(expected, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');
  if (expBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expBuf, sigBuf);
}

export interface SettleableInvoice {
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod: 'cash' | 'upi' | 'card' | 'online_razorpay';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

/**
 * Applies a verified Razorpay capture idempotently, updating paidAmount,
 * remaining balanceAmount, and partial/paid status accurately for 50% or 100% payments.
 */
export function applyRazorpaySettlement(
  invoice: SettleableInvoice,
  params: {
    amountInPaise: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  }
): { duplicate: boolean; settledNowInr: number } {
  if (params.razorpayPaymentId && invoice.razorpayPaymentId === params.razorpayPaymentId) {
    return { duplicate: true, settledNowInr: 0 };
  }

  const paidNowInr = Math.max(0, Math.round((Number(params.amountInPaise) || 0) / 100));
  const nextPaid = Math.min(invoice.grandTotal, (invoice.paidAmount || 0) + paidNowInr);
  const nextBalance = Math.max(0, invoice.grandTotal - nextPaid);

  invoice.paidAmount = nextPaid;
  invoice.balanceAmount = nextBalance;
  invoice.paymentStatus = nextBalance === 0 ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid';
  invoice.paymentMethod = 'online_razorpay';
  if (params.razorpayOrderId) invoice.razorpayOrderId = params.razorpayOrderId;
  if (params.razorpayPaymentId) invoice.razorpayPaymentId = params.razorpayPaymentId;

  return { duplicate: false, settledNowInr: paidNowInr };
}
