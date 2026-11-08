export const AVATAR_IMAGE = {
  extension: '.webp',
  quality: 85,
  pendingTtlMs: 24 * 60 * 60 * 1000,
  blobZoom: 0.9,
  blobBackground: '#f4f4f5',
  blobInk: '#0a0a0c',
} as const;

export const AVATAR_GENERATE = {
  urlSetting: 'avatars.generator-url',
  defaultUrl: 'http://127.0.0.1:7860',
  path: 'sdapi/v1/txt2img',
  optionsPath: 'sdapi/v1/options',
  probeTimeoutMs: 2500,
  timeoutMs: 180_000,
  size: 512,
  styleSuffix: 'head and shoulders portrait avatar, centered, facing the viewer, painted digital illustration, soft studio lighting, warm plain background, high detail',
  negativePrompt: 'text, watermark, signature, frame, border, blurry, deformed, extra limbs, cropped head',
} as const;
