import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShopSettings extends Document {
  storeName: string;
  tagline: string;
  address: string;
  phone1: string;
  phone2: string;
  whatsappNumber: string;
  razorpayMeUrl: string;
  email: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  maxDiscountPercentage: number;
  termsAndConditions: string[];
  openingHours: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSettingsSchema = new Schema<IShopSettings>(
  {
    storeName: {
      type: String,
      default: "AL-HARAM Drycleaner's And Launderettes",
      required: true,
    },
    tagline: {
      type: String,
      default: "Premium Dry Cleaning, Steam Pressing & Fabric Care in Chattarpur",
    },
    address: {
      type: String,
      default: "A-1/67, Birla Farm Colony, Chattarpur, New Delhi-110074",
      required: true,
    },
    phone1: { type: String, default: "+91 87005 48416" },
    phone2: { type: String, default: "+91 88513 07434" },
    whatsappNumber: { type: String, default: "918700548416" },
    razorpayMeUrl: { type: String, default: "https://razorpay.me/@ashiyaalharamdrycleaner" },
    email: { type: String, default: "contact@alharamdrycleaners.com" },
    invoicePrefix: { type: String, default: "AHDC" },
    defaultTaxRate: { type: Number, default: 0 },
    maxDiscountPercentage: { type: Number, default: 25 },
    termsAndConditions: {
      type: [String],
      default: [
        "Please check clothes at the time of delivery.",
        "Management is not responsible for color bleeding due to defective manufacturing.",
        "Deliveries must be collected within 30 days of the completion date.",
        "Dry cleaning or steam pressing charges apply as per our standard tariff.",
      ],
    },
    openingHours: {
      type: String,
      default: "Monday - Sunday: 9:00 AM – 9:00 PM",
    },
  },
  { timestamps: true }
);

export const ShopSettings: Model<IShopSettings> =
  mongoose.models.ShopSettings || mongoose.model<IShopSettings>('ShopSettings', ShopSettingsSchema);

