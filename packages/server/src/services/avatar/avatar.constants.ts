export const AVATAR_IMAGE = {
  extension: '.webp',
  quality: 85,
  pendingTtlMs: 24 * 60 * 60 * 1000,
  blobZoom: 0.9,
  blobBackground: '#f4f4f5',
  blobInk: '#0a0a0c',
} as const;

export const AVATAR_GENERATE = {
  timeoutMs: 180_000,
  prompt: 'A square head and shoulders portrait avatar of',
  style: 'Centered, facing the viewer, painted digital illustration, soft studio lighting, plain warm background, high detail. No text, watermark, signature or border.',
} as const;
