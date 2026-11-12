import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { Review } from '@/models/Review';
import { OrderInvoice } from '@/models/OrderInvoice';
import { getCurrentUser } from '@/lib/auth';
import { normalizeIndianPhone } from '@/lib/phone';
import {
  CACHE_TAGS,
  PUBLIC_CACHE_HEADERS,
  getCachedApprovedReviews,
  invalidateCacheTag,
} from '@/lib/cache';

async function getApprovedStats() {
  return getCachedApprovedReviews();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('all') === 'true';

    if (includeAll) {
      const session = await getCurrentUser();
      if (!session || session.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Forbidden: Only Admin can view all unapproved reviews.' },
          { status: session ? 403 : 401 }
        );
      }

      await connectToDatabase();

      const allReviews = await Review.find({})
        .select('-customerPhone')
        .sort({ isApproved: 1, createdAt: -1 })
        .lean();

      const approvedOnly = allReviews.filter((r) => r.isApproved);
      const averageRating =
        approvedOnly.length > 0
          ? Number(
              (
                approvedOnly.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) /
                approvedOnly.length
              ).toFixed(1)
            )
          : 5.0;

      return NextResponse.json(
        {
          success: true,
          reviews: allReviews,
          totalReviews: allReviews.length,
          approvedCount: approvedOnly.length,
          pendingCount: allReviews.length - approvedOnly.length,
          averageRating,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { reviews, totalReviews, averageRating } = await getApprovedStats();

    return NextResponse.json(
      {
        success: true,
        reviews,
        totalReviews,
        averageRating,
      },
      { headers: PUBLIC_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only authenticated users (signed-in customers or admin) can submit a new review
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required. Please sign in to submit a customer review.',
        },
        { status: 401 }
      );
    }

    if (session.role !== 'customer' && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only registered customers or admin can submit reviews.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, role, serviceType, rating, comment, phone, isApproved, isVerifiedCustomer } = body;

    const cleanName = String(name || session.name || '').trim();
    const cleanComment = String(comment || '').trim();
    const numericRating = Math.round(Number(rating));

    if (cleanName.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Please enter a reviewer name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { success: false, message: 'Please select a star rating between 1 and 5.' },
        { status: 400 }
      );
    }

    if (cleanComment.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Please write a short review (at least 8 characters).' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const isAdmin = session.role === 'admin';
    const rawPhone = phone || session.phone || '';
    const cleanPhone = rawPhone ? normalizeIndianPhone(String(rawPhone)) : '';

    let verifiedStatus = false;
    if (isAdmin && typeof isVerifiedCustomer === 'boolean') {
      verifiedStatus = isVerifiedCustomer;
    } else if (cleanPhone.length >= 10) {
      const existingOrder = await OrderInvoice.exists({
        'customer.phone': { $in: [cleanPhone, `0${cleanPhone}`] },
      });
      if (existingOrder) {
        verifiedStatus = true;
      }
    }

    // Admin-created reviews default to published; customer-submitted reviews wait for Admin approval
    const approvedStatus = isAdmin ? isApproved !== false : false;

    const created = await Review.create({
      userId: session.userId,
      name: cleanName.slice(0, 60),
      role:
        String(role || (verifiedStatus ? 'Verified Customer' : 'Customer'))
          .trim()
          .slice(0, 50) || 'Customer',
      serviceType:
        String(serviceType || 'Dry Cleaning & Steam Press')
          .trim()
          .slice(0, 60) || 'Dry Cleaning & Steam Press',
      rating: numericRating,
      comment: cleanComment.slice(0, 500),
      isVerifiedCustomer: verifiedStatus,
      customerPhone: cleanPhone || undefined,
      isApproved: approvedStatus,
      editedByAdmin: false,
    });

    const safeReview = {
      _id: created._id,
      name: created.name,
      role: created.role,
      serviceType: created.serviceType,
      rating: created.rating,
      comment: created.comment,
      isVerifiedCustomer: created.isVerifiedCustomer,
      isApproved: created.isApproved,
      createdAt: created.createdAt,
    };

    if (approvedStatus) {
      invalidateCacheTag(CACHE_TAGS.REVIEWS);
      revalidatePath('/');
    }

    const { totalReviews, averageRating } = await getApprovedStats();

    return NextResponse.json(
      {
        success: true,
        message: approvedStatus
          ? 'Review published successfully.'
          : 'Review submitted! It will appear on the website once approved by Admin.',
        review: safeReview,
        totalReviews,
        averageRating,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to submit review';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
