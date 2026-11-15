export type PaymentPlan = 'full' | 'half' | 'custom';

export interface PaymentOptionsSummary {
  total: number;
  alreadyPaid: number;
  remaining: number;
  minHalfAmount: number;
  halfPayableAmount: number;
  remainingAfterHalf: number;
  canChooseHalf: boolean;
}

/**
 * Computes payment options from an order's grandTotal and already-paid balance.
 * Enforces mandatory 50% advance payment minimum vs 100% full payment for customers.
 */
export function calculatePaymentOptions(
  grandTotal: number,
  paidAmount = 0
): PaymentOptionsSummary {
  const total = Math.max(0, Math.round(Number(grandTotal) || 0));
  const alreadyPaid = Math.min(total, Math.max(0, Math.round(Number(paidAmount) || 0)));
  const remaining = Math.max(0, total - alreadyPaid);
  const minHalfAmount = Math.ceil(total * 0.5);

  // If customer has not yet paid the 50% advance, they can choose 50% or Full
  // If they already paid 50% or more, only the remaining balance is payable
  const canChooseHalf = alreadyPaid < minHalfAmount && remaining > 0;
  const halfPayableAmount = Math.min(remaining, Math.max(0, minHalfAmount - alreadyPaid));
  const remainingAfterHalf = Math.max(0, remaining - halfPayableAmount);

  return {
    total,
    alreadyPaid,
    remaining,
    minHalfAmount,
    halfPayableAmount,
    remainingAfterHalf,
    canChooseHalf,
  };
}

export function resolvePlanPayableAmount(
  grandTotal: number,
  paidAmount: number,
  plan: PaymentPlan,
  customAmount?: number
): { amount: number; effectivePlan: 'full' | 'half' | 'custom' } {
  const opts = calculatePaymentOptions(grandTotal, paidAmount);
  if (plan === 'half' && opts.canChooseHalf) {
    return { amount: opts.halfPayableAmount, effectivePlan: 'half' };
  }
  if (plan === 'custom' && customAmount !== undefined && customAmount !== null) {
    const raw = Number(customAmount);
    const clamped = Math.max(
      0,
      Math.min(opts.remaining, Math.round((Number.isFinite(raw) ? raw : 0) * 100) / 100)
    );
    return { amount: clamped, effectivePlan: 'custom' };
  }
  return { amount: opts.remaining, effectivePlan: 'full' };
}

