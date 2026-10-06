export const SECURITY = {
  ipAddress: {
    headers: ['cf-connecting-ip', 'true-client-ip', 'x-real-ip', 'x-forwarded-for'],
    fallback: '127.0.0.1',
  },
  privateIpV4: /^(10|127|0)\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  privateIpV6: /^(::1?$|f[cd]|fe80:)/i,
} as const;
