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
  const payStatus =
    payload.paymentStatus === 'paid'
      ? '✅ Paid'
      : payload.paymentStatus === 'partial'
      ? `⚠️ Partial (Paid: ₹${payload.paidAmount}, Bal: ₹${payload.balanceAmount})`
      : '⏳ Due upon delivery';

  // Format line items (show top 5 to keep WhatsApp message clean)
  const itemsText = payload.items
    .slice(0, 5)
    .map(
      (item) =>
        `  • ${item.quantity}x ${item.name} (${item.serviceType.replace('_', ' ')}) - ₹${item.total}`
    )
    .join('\n');

  const moreItemsText =
    payload.items.length > 5 ? `  ...and ${payload.items.length - 5} more items\n` : '';

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

export function generateWhatsAppReadyAlertUrl(payload: {
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  grandTotal: number;
  balanceAmount?: number;
  status: string;
  itemsCount: number;
  itemsSummary?: string;
  invoiceUrl?: string;
}): string {
  let cleanPhone = payload.customerPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const isReady = payload.status === 'ready';
  const isDelivered = payload.status === 'delivered';
  const isOut = payload.status === 'out_for_delivery';

  let alertTitle = '✨ *AL-HARAM DRYCLEANERS - ORDER STATUS ALERT* ✨';
  let statusMessage = `Your garments for Invoice *#${payload.invoiceNumber}* are currently *${payload.status.replace('_', ' ').toUpperCase()}*.`;

  if (isReady) {
    alertTitle = '🎉 *GARMENTS READY FOR COLLECTION - AL-HARAM DRYCLEANERS* 🎉';
    statusMessage = `Great news! Your cleaned & steam-pressed garments for Invoice *#${payload.invoiceNumber}* are now *READY FOR COLLECTION* at our Chattarpur store.`;
  } else if (isDelivered) {
    alertTitle = '✨ *ORDER DELIVERED - AL-HARAM DRYCLEANERS* ✨';
    statusMessage = `Your dry cleaning order *#${payload.invoiceNumber}* has been successfully delivered. Thank you for choosing Al-Haram!`;
  } else if (isOut) {
    alertTitle = '🛵 *OUT FOR DELIVERY - AL-HARAM DRYCLEANERS* ✨';
    statusMessage = `Your garments for Invoice *#${payload.invoiceNumber}* are *OUT FOR DELIVERY* and will reach your doorstep shortly.`;
  }

  const balanceText =
    (payload.balanceAmount ?? 0) > 0
      ? `⚠️ *Balance Due:* ₹${payload.balanceAmount}/- (Net: ₹${payload.grandTotal})`
      : `✅ *Payment:* Fully Settled / Paid (₹${payload.grandTotal})`;

  const message = `${alertTitle}
━━━━━━━━━━━━━━━━━━━━━━━━
Dear *${payload.customerName}*,

${statusMessage}

🧺 *Garments:* ${payload.itemsCount} items${payload.itemsSummary ? ` (${payload.itemsSummary})` : ''}
💰 ${balanceText}

📍 *Store Collection Address:*
A-1/67, Birla Farm Colony, Chattarpur, New Delhi - 110074
⏰ *Timings:* Mon - Sun: 9:00 AM - 9:00 PM
📞 *Helpline / WhatsApp:* +91 87005 48416 / +91 88513 07434

${payload.invoiceUrl ? `🔗 *Track Order & View Digital Receipt:*\n${payload.invoiceUrl}\n` : ''}Thank you for trusting Al-Haram Dry Cleaners!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
