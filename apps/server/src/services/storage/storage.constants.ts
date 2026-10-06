export const STORAGE = {
  maxBytes: 10 * 1024 * 1024,
  maxFilesPerMessage: 4,
  turnImages: 4,
  deleteBatchSize: 1000,
  unsentTtlMs: 24 * 60 * 60 * 1000,
  imageTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  documentTypes: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json'],
  roomKey: (organizationId: string, roomId: string) => `rooms/${organizationId}/${roomId}/`,
  driverKeySegment: /^[a-z0-9:-]+$/,
  driverListLimit: 1000,
} as const;
