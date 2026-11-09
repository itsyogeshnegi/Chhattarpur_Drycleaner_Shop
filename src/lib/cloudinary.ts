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

