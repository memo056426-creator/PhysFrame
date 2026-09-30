import { describe, expect, it } from 'vitest';
import { detectReferenceImageMime } from './referenceImage';

describe('reference image security', () => {
  it('accepts JPEG magic bytes even when the declared MIME is missing', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00])]);
    await expect(detectReferenceImageMime(blob)).resolves.toBe('image/jpeg');
  });

  it('accepts PNG magic bytes', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]);
    await expect(detectReferenceImageMime(blob)).resolves.toBe('image/png');
  });

  it('accepts WebP magic bytes', async () => {
    const blob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])]);
    await expect(detectReferenceImageMime(blob)).resolves.toBe('image/webp');
  });

  it('rejects SVG/HTML-like input even when supplied as a Blob', async () => {
    const blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' });
    await expect(detectReferenceImageMime(blob)).resolves.toBeNull();
  });
});
