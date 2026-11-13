export type PaymentPlan = 'full' | 'custom' | 'half';

export interface PaymentOptionsSummary {
  total: number;
  alreadyPaid: number;
  remaining: number;
  minHalfAmount?: number;
  remainingAfterHalf?: number;
  canChooseHalf?: boolean;
}

/**
 * Computes payment options from an order's grandTotal and already-paid balance.
 * Supports 100% full payment, custom advance (even ₹0), or remaining balance.
 */
export function calculatePaymentOptions(
  grandTotal: number,
  paidAmount = 0
): PaymentOptionsSummary {
  const total = Math.max(0, Math.round(Number(grandTotal) || 0));
  const alreadyPaid = Math.min(total, Math.max(0, Math.round(Number(paidAmount) || 0)));
  const remaining = Math.max(0, total - alreadyPaid);
  const minHalfAmount = Math.ceil(total * 0.5);
  const remainingAfterHalf = Math.max(0, total - minHalfAmount);

  return {
    total,
    alreadyPaid,
    remaining,
    minHalfAmount,
    remainingAfterHalf,
    canChooseHalf: false, // 50% advance mandatory restriction removed
  };
}

export function resolvePlanPayableAmount(
  grandTotal: number,
  paidAmount: number,
  plan: PaymentPlan,
  customAmount?: number
): { amount: number; effectivePlan: 'full' | 'custom' } {
  const opts = calculatePaymentOptions(grandTotal, paidAmount);
  if (plan === 'custom') {
    const raw = customAmount !== undefined && customAmount !== null ? Number(customAmount) : 0;
    const clamped = Math.max(
      0,
      Math.min(opts.remaining, Math.round((Number.isFinite(raw) ? raw : 0) * 100) / 100)
    );
    return { amount: clamped, effectivePlan: 'custom' };
  }
  return { amount: opts.remaining, effectivePlan: 'full' };
}

