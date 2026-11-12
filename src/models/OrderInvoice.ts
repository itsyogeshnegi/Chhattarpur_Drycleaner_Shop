import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvoiceItem {
  name: string;
  serviceType: 'dry_clean' | 'steam_iron' | 'laundry_piece' | 'laundry_kg';
  rate: number;
  quantity: number;
  total: number;
  notes?: string;
  inspectionImages?: Array<{
    url: string;
    caption?: string;
  }>;
}

export interface IOrderInvoice extends Document {
  invoiceNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  items: IInvoiceItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod: 'cash' | 'upi' | 'card' | 'online_razorpay';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: 'received' | 'in_process' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  rackLocation?: string;
  internalNotes?: string;
  pickupDate?: Date;
  deliveryDueDate?: Date;
  deliveredAt?: Date;
  deliveryOtp?: string;
  deliveryOtpGeneratedAt?: Date;
  deliveryVerifiedAt?: Date;
  deliveryVerifiedBy?: string;
  smsNotificationSent: boolean;
  smsSentAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const InspectionImageSchema = new Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, trim: true },
  },
  { _id: false }
);

const InvoiceItemSchema = new Schema(
  {
    name: { type: String, required: true },
    serviceType: {
      type: String,
      required: true,
      enum: ['dry_clean', 'steam_iron', 'laundry_piece', 'laundry_kg'],
      default: 'dry_clean',
    },
    rate: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    total: { type: Number, required: true },
    notes: { type: String, trim: true },
    inspectionImages: {
      type: [InspectionImageSchema],
      default: undefined,
    },
  },
  { _id: false }
);

const OrderInvoiceSchema = new Schema<IOrderInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      address: { type: String, trim: true },
    },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'none'],
      default: 'none',
    },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'online_razorpay'],
      default: 'cash',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    status: {
      type: String,
      enum: ['received', 'in_process', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'received',
    },
    rackLocation: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    pickupDate: { type: Date, default: Date.now },
    deliveryDueDate: { type: Date },
    deliveredAt: { type: Date },
    deliveryOtp: { type: String, trim: true },
    deliveryOtpGeneratedAt: { type: Date },
    deliveryVerifiedAt: { type: Date },
    deliveryVerifiedBy: { type: String, trim: true },
    smsNotificationSent: { type: Boolean, default: false },
    smsSentAt: { type: Date },
    createdBy: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

// Compound indexes for ultra-fast query responses
OrderInvoiceSchema.index({ 'customer.phone': 1, createdAt: -1 });
OrderInvoiceSchema.index({ status: 1, createdAt: -1 });
OrderInvoiceSchema.index({ createdAt: -1 });

export const OrderInvoice: Model<IOrderInvoice> =
  mongoose.models.OrderInvoice || mongoose.model<IOrderInvoice>('OrderInvoice', OrderInvoiceSchema);

