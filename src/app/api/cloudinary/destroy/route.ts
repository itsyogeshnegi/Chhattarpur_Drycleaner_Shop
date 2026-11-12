import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyCloudinaryAsset, extractCloudinaryPublicId } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!['admin', 'counter_staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only store staff can manage inspection photos.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
    const rawPublicId = typeof body?.publicId === 'string' ? body.publicId.trim() : '';
    const publicId = rawPublicId || extractCloudinaryPublicId(rawUrl);

    if (!publicId || !publicId.startsWith('alharam_garments/')) {
      return NextResponse.json(
        { success: false, message: 'Valid garment inspection Cloudinary asset identifier is required.' },
        { status: 400 }
      );
    }

    const outcome = await destroyCloudinaryAsset(publicId);
    return NextResponse.json({
      success: outcome.success,
      result: outcome.result || 'unknown',
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

