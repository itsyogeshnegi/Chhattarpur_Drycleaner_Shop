import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { Review } from '@/models/Review';
import { getCurrentUser } from '@/lib/auth';
import { CACHE_TAGS, invalidateCacheTag } from '@/lib/cache';
import mongoose from 'mongoose';

// Strictly Admin-only: Edit, approve/hide, or delete any customer review
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only Admin can edit or approve reviews.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid review ID.' }, { status: 400 });
    }

    const body = await req.json();
    await connectToDatabase();

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found.' }, { status: 404 });
    }

    if (typeof body.name === 'string') {
      const cleanName = body.name.trim();
      if (cleanName.length < 2) {
        return NextResponse.json(
          { success: false, message: 'Reviewer name must be at least 2 characters.' },
          { status: 400 }
        );
      }
      review.name = cleanName.slice(0, 60);
    }

    if (typeof body.role === 'string') {
      review.role = body.role.trim().slice(0, 50) || 'Verified Customer';
    }

    if (typeof body.serviceType === 'string') {
      review.serviceType = body.serviceType.trim().slice(0, 60) || 'Dry Cleaning & Steam Press';
    }

    if (body.rating !== undefined) {
      const numericRating = Math.round(Number(body.rating));
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return NextResponse.json(
          { success: false, message: 'Rating must be between 1 and 5 stars.' },
          { status: 400 }
        );
      }
      review.rating = numericRating;
    }

    if (typeof body.comment === 'string') {
      const cleanComment = body.comment.trim();
      if (cleanComment.length < 8) {
        return NextResponse.json(
          { success: false, message: 'Review comment must be at least 8 characters.' },
          { status: 400 }
        );
      }
      review.comment = cleanComment.slice(0, 500);
    }

    if (typeof body.isVerifiedCustomer === 'boolean') {
      review.isVerifiedCustomer = body.isVerifiedCustomer;
    }

    if (typeof body.isApproved === 'boolean') {
      review.isApproved = body.isApproved;
    }

    review.editedByAdmin = true;
    await review.save();

    invalidateCacheTag(CACHE_TAGS.REVIEWS);
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully.',
      review: {
        _id: review._id,
        name: review.name,
        role: review.role,
        serviceType: review.serviceType,
        rating: review.rating,
        comment: review.comment,
        isVerifiedCustomer: review.isVerifiedCustomer,
        isApproved: review.isApproved,
        editedByAdmin: review.editedByAdmin,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update review';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only Admin can delete reviews.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid review ID.' }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await Review.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Review not found.' }, { status: 404 });
    }

    invalidateCacheTag(CACHE_TAGS.REVIEWS);
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: 'Review deleted permanently.',
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete review';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

