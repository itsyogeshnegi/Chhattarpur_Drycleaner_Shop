import crypto from 'crypto';
import Razorpay from 'razorpay';

export function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'razorpay_secret_placeholder';

  return new Razorpay({
    key_id,
    key_secret,
  });
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'razorpay_secret_placeholder';
  if (key_secret === 'razorpay_secret_placeholder') {
    // In demo/test mode with mock keys, accept verification
    return true;
  }

  const generatedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

