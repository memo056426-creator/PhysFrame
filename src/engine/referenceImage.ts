export const REFERENCE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const MAX_REFERENCE_EDGE = 4096;

type SafeRasterMime = 'image/jpeg' | 'image/png' | 'image/webp';

const detectRasterMimeFromBytes = (bytes: Uint8Array): SafeRasterMime | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
};

export const detectReferenceImageMime = async (blob: Blob): Promise<SafeRasterMime | null> => {
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return detectRasterMimeFromBytes(header);
};

export const sanitizeReferenceImage = async (blob: Blob): Promise<Blob> => {
  const detectedMime = await detectReferenceImageMime(blob);
  if (!detectedMime) {
    throw new Error('Unsupported reference image. Use JPEG, PNG, or WebP.');
  }

  const bitmap = await createImageBitmap(blob);
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('Reference image could not be decoded.');

    const scale = Math.min(1, MAX_REFERENCE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Reference image sanitization is unavailable in this browser.');

    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        safeBlob => safeBlob ? resolve(safeBlob) : reject(new Error('Could not re-encode reference image.')),
        'image/png'
      );
    });
  } finally {
    bitmap.close();
  }
};
