import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderInvoice } from '@/models/OrderInvoice';
import { ShopSettings } from '@/models/ShopSettings';
import {
  buildRazorpayMePayUrl,
  getRazorpayClient,
  isRazorpayConfigured,
} from '@/lib/razorpay';
import {
  calculatePaymentOptions,
  PaymentPlan,
  resolvePlanPayableAmount,
} from '@/lib/paymentPlan';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, paymentPlan = 'full', customAmount } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ success: false, message: 'Invoice ID required' }, { status: 400 });
    }

    if (paymentPlan !== 'half' && paymentPlan !== 'full' && paymentPlan !== 'custom') {
      return NextResponse.json(
        { success: false, message: 'Invalid payment plan. Choose full payment or custom amount.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const query = mongoose.Types.ObjectId.isValid(invoiceId)
      ? { $or: [{ _id: invoiceId }, { invoiceNumber: invoiceId }] }
      : { invoiceNumber: invoiceId };

    const [invoice, settings] = await Promise.all([
      OrderInvoice.findOne(query),
      ShopSettings.findOne().select('razorpayMeUrl').lean(),
    ]);

    if (!invoice) {
      return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.paymentStatus === 'paid') {
      return NextResponse.json(
        { success: false, message: 'Invoice is already fully paid' },
        { status: 400 }
      );
    }

    const opts = calculatePaymentOptions(invoice.grandTotal, invoice.paidAmount);
    if (opts.remaining <= 0) {
      return NextResponse.json(
        { success: false, message: 'No balance amount due on this invoice' },
        { status: 400 }
      );
    }

    const { amount: payableAmount, effectivePlan } = resolvePlanPayableAmount(
      invoice.grandTotal,
      invoice.paidAmount,
      paymentPlan as PaymentPlan,
      customAmount !== undefined && customAmount !== null ? Number(customAmount) : undefined
    );

    // If 0 is chosen (Pay on Delivery / Pay on Pickup), confirm directly without Razorpay API call
    if (payableAmount === 0) {
      return NextResponse.json({
        success: true,
        mode: 'pay_on_delivery',
        paymentPlan: effectivePlan,
        payableAmount: 0,
        remainingAfterPayment: opts.remaining,
        invoiceNumber: invoice.invoiceNumber,
        message: 'Order confirmed for Pay on Delivery. No online payment needed upfront.',
        customer: invoice.customer,
      });
    }

    const amountInPaise = Math.round(payableAmount * 100);
    const remainingAfterPayment = Math.max(0, opts.remaining - payableAmount);
    const razorpayMePayUrl = buildRazorpayMePayUrl(settings?.razorpayMeUrl);

    // Mode 1: Real Razorpay Standard Checkout when API keys are configured
    if (isRazorpayConfigured()) {
      const razorpay = getRazorpayClient();
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `${invoice.invoiceNumber}-${effectivePlan}`,
        notes: {
          customerName: invoice.customer.name,
          customerPhone: invoice.customer.phone,
          invoiceNumber: invoice.invoiceNumber,
          paymentPlan: effectivePlan,
          payableAmount: String(payableAmount),
        },
      });

      invoice.razorpayOrderId = razorpayOrder.id;
      await invoice.save();

      return NextResponse.json({
        success: true,
        mode: 'checkout',
        paymentPlan: effectivePlan,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        payableAmount,
        remainingAfterPayment,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        customer: invoice.customer,
        razorpayMeUrl: razorpayMePayUrl,
      });
    }

    // Mode 2: Direct Razorpay.me payment handle fallback until API keys are added
    return NextResponse.json({
      success: true,
      mode: 'payment_link',
      paymentPlan: effectivePlan,
      payableAmount,
      remainingAfterPayment,
      amount: amountInPaise,
      currency: 'INR',
      razorpayMeUrl: razorpayMePayUrl,
      customer: invoice.customer,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
