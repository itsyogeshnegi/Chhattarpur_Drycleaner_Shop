import crypto from 'crypto';

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'fuicmjkc',
  apiKey: process.env.CLOUDINARY_API_KEY || '741695341247667',
  apiSecret: process.env.CLOUDINARY_API_SECRET || 'druXfSxOvU8zvAy5WLE83z7USg0',
};

/**
 * Generates signed parameters for direct, secure client-to-Cloudinary uploads
 */
export function generateCloudinarySignature(folder = 'alharam_garments') {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + CLOUDINARY_CONFIG.apiSecret)
    .digest('hex');

  return {
    signature,
    timestamp,
    apiKey: CLOUDINARY_CONFIG.apiKey,
    cloudName: CLOUDINARY_CONFIG.cloudName,
    folder,
  };
}

/**
 * Extracts the Cloudinary public_id (including folder) from a secure upload URL.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return null;
  }

  const afterUpload = url.split('/upload/')[1];
  if (!afterUpload) return null;

  const cleanPath = afterUpload.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  // Drop version segment (e.g. v1730000000) and any preceding transform segments
  const versionIndex = segments.findIndex((seg) => /^v\d+$/.test(seg));
  const assetSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
  if (assetSegments.length === 0) return null;

  const joined = assetSegments.join('/');
  return joined.replace(/\.[a-zA-Z0-9]+$/, '') || null;
}

/**
 * Deletes an uploaded Cloudinary asset using a signed SHA-1 destroy request.
 */
export async function destroyCloudinaryAsset(
  publicId: string
): Promise<{ success: boolean; result?: string }> {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + CLOUDINARY_CONFIG.apiSecret)
    .digest('hex');

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: CLOUDINARY_CONFIG.apiKey,
    signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`,
    {
      method: 'POST',
      body,
    }
  );

  const data = await res.json();
  return {
    success: res.ok && (data.result === 'ok' || data.result === 'not found'),
    result: data.result,
  };
}

/**
 * Formats a Cloudinary URL with auto-optimization transformations
 */
export function getOptimizedImageUrl(url: string, width = 800): string {
  if (!url || !url.includes('res.cloudinary.com')) {
    return url;
  }
  // Inject transformation string after /upload/
  const searchPattern = '/upload/';
  const replacement = `/upload/f_auto,q_auto,w_${width},c_limit/`;
  return url.replace(searchPattern, replacement);
}

