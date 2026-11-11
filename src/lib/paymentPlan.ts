export type PaymentPlan = 'half' | 'full';

export interface PaymentOptionsSummary {
  total: number;
  alreadyPaid: number;
  remaining: number;
  minHalfAmount: number;
  remainingAfterHalf: number;
  canChooseHalf: boolean;
}

/**
 * Computes mandatory minimum 50% advance vs 100% full payment options
 * from an order's grandTotal and already-paid balance.
 */
export function calculatePaymentOptions(
  grandTotal: number,
  paidAmount = 0
): PaymentOptionsSummary {
  const total = Math.max(0, Math.round(Number(grandTotal) || 0));
  const alreadyPaid = Math.min(total, Math.max(0, Math.round(Number(paidAmount) || 0)));
  const remaining = Math.max(0, total - alreadyPaid);
  const minHalfAmount = Math.ceil(total * 0.5);
  const canChooseHalf = alreadyPaid === 0 && remaining > 1;
  const remainingAfterHalf = Math.max(0, total - minHalfAmount);

  return {
    total,
    alreadyPaid,
    remaining,
    minHalfAmount,
    remainingAfterHalf,
    canChooseHalf,
  };
}

export function resolvePlanPayableAmount(
  grandTotal: number,
  paidAmount: number,
  plan: PaymentPlan
): { amount: number; effectivePlan: PaymentPlan } {
  const opts = calculatePaymentOptions(grandTotal, paidAmount);
  if (plan === 'half' && opts.canChooseHalf) {
    return { amount: opts.minHalfAmount, effectivePlan: 'half' };
  }
  return { amount: opts.remaining, effectivePlan: 'full' };
}

