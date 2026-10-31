export const CHAT = {
  contextWarningPercent: 60,
  contextCriticalPercent: 80,
  attachmentScheme: 'attachment:',
  entryPrefix: 'entry-',
  liveMessageId: 'live',
  outgoingPrefix: 'outgoing-',
  historyPageSize: 50,
  aroundPageSize: 25,
  reactionsPageSize: 100,
  peerNotePattern: /^\[[^\]\n]*\]\n\n/u,
} as const;

export const CHAT_FILE_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
} as const;
