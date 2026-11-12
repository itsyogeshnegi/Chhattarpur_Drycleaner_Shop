import { NextResponse } from 'next/server';
import { generateCloudinarySignature } from '@/lib/cloudinary';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'counter_staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only store staff can upload garment photos.' },
        { status: 403 }
      );
    }

    const signatureData = generateCloudinarySignature('alharam_garments');
    return NextResponse.json({ success: true, ...signatureData });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

