export const MCP_PRESETS = [
  {
    name: 'cloudflare',
    title: 'Cloudflare',
    url: 'https://mcp.cloudflare.com/mcp',
    documentation: 'https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/',
  },
  {
    name: 'linear',
    title: 'Linear',
    url: 'https://mcp.linear.app/mcp',
    documentation: 'https://linear.app/docs/mcp',
  },
  {
    name: 'notion',
    title: 'Notion',
    url: 'https://mcp.notion.com/mcp',
    documentation: 'https://developers.notion.com/guides/mcp/get-started-with-mcp',
  },
  {
    name: 'sentry',
    title: 'Sentry',
    url: 'https://mcp.sentry.dev/mcp',
    documentation: 'https://mcp.sentry.dev/',
  },
] as const;
