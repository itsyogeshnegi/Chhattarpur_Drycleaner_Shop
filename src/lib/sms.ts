/**
 * SMS Notification Engine
 * Sends SMS alerts when garments are ready for collection or delivery.
 */

export interface SmsPayload {
  customerPhone: string;
  customerName: string;
  invoiceNumber: string;
  grandTotal: number;
}

export async function sendOrderReadySms(payload: SmsPayload): Promise<{ success: boolean; message: string }> {
  // Normalize phone (10-digit Indian mobile)
  let phone = payload.customerPhone.replace(/[^0-9]/g, '');
  if (phone.length === 12 && phone.startsWith('91')) {
    phone = phone.substring(2);
  }

  const messageText = `Dear ${payload.customerName}, your garments (Invoice #${payload.invoiceNumber}) are ready for collection at Al Haram Dry Cleaner, Chattarpur. Total: Rs. ${payload.grandTotal}. Store: +918700548416`;

  const fast2SmsApiKey = process.env.FAST2SMS_API_KEY;

  if (fast2SmsApiKey && fast2SmsApiKey !== 'placeholder') {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: messageText,
          numbers: phone,
        }),
      });

      const data = await response.json();
      if (data.return) {
        return { success: true, message: 'SMS delivered successfully via Fast2SMS' };
      } else {
        return { success: false, message: data.message || 'Fast2SMS dispatch failed' };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `SMS network error: ${errorMsg}` };
    }
  }

  // Fallback dev mode logger
  console.log(`[SMS DISPATCHED MOCK] To: ${phone} | Content: "${messageText}"`);
  return {
    success: true,
    message: `[Development Mode] SMS simulated successfully to +91-${phone}. Configure FAST2SMS_API_KEY in .env.local to send live telecom SMS.`,
  };
}

