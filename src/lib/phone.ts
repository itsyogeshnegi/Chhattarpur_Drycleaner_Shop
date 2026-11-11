/**
 * Normalizes Indian mobile numbers cleanly.
 * Strips all non-digits, removes leading zeros (e.g. "08745073655" -> "8745073655"),
 * and strips country code "+91" / "91" when 12 digits.
 */
export function normalizeIndianPhone(phone: string | undefined | null): string {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  // Strip any leading zeros
  digits = digits.replace(/^0+/, '');
  // Strip 91 prefix if 12 digits (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // Strip any leading zeros again if they appeared after country code (e.g. +91 08745...)
  digits = digits.replace(/^0+/, '');
  // Return last 10 digits if longer
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
}

/**
 * Sanitizes live input in phone number fields so leading '0' cannot be kept.
 */
export function sanitizePhoneInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  // Prevent starting with 0
  return digitsOnly.replace(/^0+/, '').slice(0, 10);
}

