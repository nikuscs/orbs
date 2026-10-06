export const ROUTE = {
  hops: 3,
  buffer: 2,
  replies: 8,
  contextMessagesPerBot: 6,
  contextMessagesHuman: 6,
  contextReactions: 6,
  contextMessagesBots: 200,
  promptChars: 20_000,
  retryMs: 30_000,
  botCacheTtlMs: 60_000,
} as const;

export const ROUTE_JEV = {
  reply: 0.8,
  needs: 0.7,
  winner: 0.6,
  margin: 0.3,
  group: 0.8,
  answer: 0.8,
  context: 6,
  scope: 300,
  chars: 600,
  timeout: 5000,
  approval: 0.9,
  input: 2000,
} as const;

export const ROUTE_JUDGE = {
  attempts: 2,
  timeoutMs: 12_000,
  context: 12,
  scope: 600,
  chars: 1200,
} as const;

export const ROUTE_SECRETS = [
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/g,
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{22,}/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/g,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}/g,
  /\borbs_[A-Za-z0-9]{20,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export const ROUTE_SECRET_VALUES = [
  /(?<keep>\b[a-z][a-z0-9+.-]*:\/\/)[^\s:@/]+:[^\s@/]+(?=@)/gi,
  /(?<keep>\b(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[:=]\s*["']?)[^\s"']{6,}/gi,
];

export const ROUTE_QUESTION = {
  needs: 'needs',
  absent: 'absent',
  handoff: 'handoff',
  answers: 'answers',
  group: 'group',
} as const;
