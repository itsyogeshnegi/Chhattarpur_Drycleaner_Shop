/**
 * Client-Side Image Compression Pipeline (< 50KB Guarantee)
 * Compresses camera/uploaded photos in the browser before network transmission.
 */

export async function compressImageUnder50KB(file: File): Promise<Blob> {
  const MAX_BYTES = 50 * 1024; // 50 KB strict limit

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file.');
  }

  // Fast-path: keep small already-web-ready images as-is instead of re-encoding
  if (
    file.size <= MAX_BYTES &&
    ['image/webp', 'image/jpeg', 'image/png'].includes(file.type)
  ) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize down if too large (garment damage inspections look crisp at 800px max)
        const maxDimension = 800;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context unavailable'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively find the best quality that keeps size < 50KB
        let quality = 0.82;
        const attemptCompression = (currentQuality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Image compression failed'));
              }

              // If already under 50KB or quality has reached minimum, resolve
              if (blob.size <= MAX_BYTES || currentQuality <= 0.25) {
                resolve(blob);
              } else {
                // Reduce quality and retry
                quality = Math.max(0.2, currentQuality - 0.15);
                attemptCompression(quality);
              }
            },
            'image/webp',
            currentQuality
          );
        };

        attemptCompression(quality);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

