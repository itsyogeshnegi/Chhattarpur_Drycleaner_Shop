export interface WhatsAppInvoicePayload {
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  grandTotal: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  paidAmount?: number;
  balanceAmount?: number;
  items: Array<{
    name: string;
    serviceType: string;
    quantity: number;
    total: number;
  }>;
  status: string;
  invoiceUrl: string;
}

export function generateWhatsAppInvoiceUrl(payload: WhatsAppInvoicePayload): string {
  // Normalize phone number (strip spaces, dashes, ensure country code 91 for India if 10 digits)
  let cleanPhone = payload.customerPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const statusEmojis: Record<string, string> = {
    received: '📥 Received',
    in_process: '🧼 In Cleaning / Pressing',
    ready: '✅ Ready for Collection',
    out_for_delivery: '🛵 Out for Delivery',
    delivered: '🎉 Delivered',
  };

  const statusText = statusEmojis[payload.status] || payload.status;
  const payStatus = payload.paymentStatus === 'paid' ? '✅ Paid' : payload.paymentStatus === 'partial' ? `⚠️ Partial (Paid: ₹${payload.paidAmount}, Bal: ₹${payload.balanceAmount})` : '⏳ Due upon delivery';

  // Format line items (show top 5 to keep WhatsApp message clean)
  const itemsText = payload.items
    .slice(0, 5)
    .map((item) => `  • ${item.quantity}x ${item.name} (${item.serviceType.replace('_', ' ')}) - ₹${item.total}`)
    .join('\n');

  const moreItemsText = payload.items.length > 5 ? `  ...and ${payload.items.length - 5} more items\n` : '';

  const message = `✨ *AL-HARAM DRYCLEANER'S AND LAUNDERETTES* ✨
━━━━━━━━━━━━━━━━━━━━━━━━
Dear *${payload.customerName}*,
Thank you for trusting Al Haram Dry Cleaners!

🧾 *Invoice #:* ${payload.invoiceNumber}
📊 *Status:* ${statusText}
💳 *Payment:* ${payStatus}
━━━━━━━━━━━━━━━━━━━━━━━━
👕 *Garments Summary:*
${itemsText}
${moreItemsText}━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Net Total:* ₹${payload.grandTotal}/-

🔗 *View Complete Invoice, Garment Photos & Download PDF:*
${payload.invoiceUrl}

📍 *Store Address:*
A-1/67, Birla Farm Colony, Chattarpur, New Delhi-110074
📞 *Helpline:* +91 87005 48416 / +91 88513 07434`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

