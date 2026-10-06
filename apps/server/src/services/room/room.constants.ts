export const ROOM = {
  timelineLimit: 50,
  historyLimit: 100,
  directIdPrefix: 'direct:',
  replyQuoteChars: 200,
  previewChars: 120,
  reactionUndoMs: 2000,
  mentionScheme: 'orbs:',
  mentionLabelMaxChars: 200,
  mentionHrefMaxChars: 256,
  everyoneHandles: new Set(['everyone', 'all', 'here']),
  filesRoot: '~/.orbs/rooms',
  fileUrlPrefix: '/api/files/',
  fileNameBytes: 200,
} as const;

export const ROOM_MENTION_LINK = String.raw`\[([^\]\n]{1,${ROOM.mentionLabelMaxChars}})\]\(([^)\s]{1,${ROOM.mentionHrefMaxChars}})\)`;
