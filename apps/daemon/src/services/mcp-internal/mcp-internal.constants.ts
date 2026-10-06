export const MCP_INTERNAL_DAEMON = {
  hostname: '127.0.0.1',
  path: '/mcp-internal',
  requestTimeoutMs: 15_000,
  maxRequestBodySize: 256 * 1024,
  unavailable: { text: 'RUN_UNAVAILABLE', isError: true },
} as const;
