import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  userId?: string;
  name: string;
  role: string;
  serviceType: string;
  rating: number;
  comment: string;
  isVerifiedCustomer: boolean;
  customerPhone?: string;
  isApproved: boolean;
  editedByAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    userId: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    role: {
      type: String,
      trim: true,
      default: 'Verified Customer',
      maxlength: 50,
    },
    serviceType: {
      type: String,
      trim: true,
      default: 'Dry Cleaning & Steam Press',
      maxlength: 60,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isVerifiedCustomer: {
      type: Boolean,
      default: false,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    editedByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

