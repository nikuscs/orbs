export const ATTACHMENT_STORAGE = {
  posterName: '.poster.jpg',
  posterMediaType: 'image/jpeg',
  posterWidth: 640,
  posterTimeoutMs: 15_000,
  ffmpegNames: ['ffmpeg', 'ffmpeg.exe'],
  ffmpegDirectories: ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'],
} as const;
