import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IServiceItem extends Document {
  name: string;
  category: 'mens' | 'womens' | 'home' | 'laundry';
  dryCleanRate: number;
  steamIronRate?: number;
  rateRangeText?: string;
  unit: string;
  popular?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceItemSchema = new Schema<IServiceItem>(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['mens', 'womens', 'home', 'laundry'],
      index: true,
    },
    dryCleanRate: { type: Number, required: true, default: 0 },
    steamIronRate: { type: Number, default: 0 },
    rateRangeText: { type: String, trim: true },
    unit: { type: String, default: 'piece', trim: true },
    popular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const ServiceItem: Model<IServiceItem> =
  mongoose.models.ServiceItem || mongoose.model<IServiceItem>('ServiceItem', ServiceItemSchema);

