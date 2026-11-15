import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY in environment variables.');
    }
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Sends a branded Password Reset OTP email to the customer.
 */
export async function sendPasswordResetOtpEmail({
  to,
  name,
  otp,
}: {
  to: string;
  name?: string;
  otp: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resend = getResendClient();
    const customerName = (name && name.trim()) || 'Valued Customer';
    const storeName =
      process.env.NEXT_PUBLIC_STORE_NAME || "AL-HARAM Drycleaner's And Launderettes";
    const storeAddress =
      process.env.NEXT_PUBLIC_STORE_ADDRESS ||
      'A-1/67, Birla Farm Colony, Chattarpur, New Delhi-110074';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP - ${storeName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%); padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
                ${storeName}
              </h1>
              <p style="margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #bae6fd; text-transform: uppercase; letter-spacing: 1.5px;">
                Customer Account Security
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px 24px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 800; color: #0f172a;">
                Password Reset Verification
              </h2>
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #475569;">
                Hello <strong>${customerName}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your customer account. Use the following 6-digit One-Time Password (OTP) to verify your identity and set a new password:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 20px 16px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #15803d; margin-bottom: 6px;">
                  Your 6-Digit Reset Code
                </span>
                <span style="display: block; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0f172a;">
                  ${otp}
                </span>
                <span style="display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-top: 6px;">
                  ⏱ Valid for 10 minutes only
                </span>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px 14px; margin: 20px 0;">
                <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #991b1b;">
                  <strong>Security Alert:</strong> Never share this OTP with anyone, including staff. Our team will never ask for your password or reset OTP.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not request a password reset, you can safely ignore this email — your account and existing password remain completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #334155;">
                ${storeName}
              </p>
              <p style="margin: 0; font-size: 10px; color: #64748b;">
                ${storeAddress}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
${storeName} - Password Reset OTP

Hello ${customerName},

We received a request to reset the password for your customer account.
Your 6-digit verification code is: ${otp}

This code is valid for 10 minutes.
Never share this OTP with anyone.

If you did not request this reset, please ignore this email.

${storeAddress}
    `.trim();

    const configuredFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    let data = await resend.emails.send({
      from: configuredFrom,
      to,
      subject: `Your Password Reset OTP: ${otp} - ${storeName}`,
      html: htmlContent,
      text: textContent,
    });

    // Graceful fallback: If configured sender domain is unverified on Resend,
    // automatically retry via Resend's default sandbox sender 'onboarding@resend.dev'
    if (
      data.error &&
      configuredFrom !== 'onboarding@resend.dev' &&
      (data.error.message.toLowerCase().includes('not verified') ||
        data.error.message.toLowerCase().includes('domain'))
    ) {
      console.warn(
        `[Resend Warning] Sender "${configuredFrom}" is not verified on Resend (${data.error.message}). Retrying with default sandbox "onboarding@resend.dev"...`
      );
      data = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to,
        subject: `Your Password Reset OTP: ${otp} - ${storeName}`,
        html: htmlContent,
        text: textContent,
      });
    }

    if (data.error) {
      console.error('[Resend Error]:', data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, id: data.data?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send email';
    console.error('[Resend Exception]:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

