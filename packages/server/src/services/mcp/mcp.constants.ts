export const MCP = {
  pathsSetting: 'mcp.paths',
  defaults: {
    paths: [],
  },
  secretPrefix: 'secrets.',
  derivedPrefix: 'mcp.',
  maxHeaders: 8,
  ownedFile: 'mcp.json',
} as const;
