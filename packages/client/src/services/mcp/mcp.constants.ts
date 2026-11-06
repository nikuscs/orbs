export const MCP = {
  presets: [
    {
      name: 'cloudflare',
      title: 'Cloudflare',
      url: 'https://mcp.cloudflare.com/mcp',
    },
    {
      name: 'linear',
      title: 'Linear',
      url: 'https://mcp.linear.app/mcp',
    },
    {
      name: 'notion',
      title: 'Notion',
      url: 'https://mcp.notion.com/mcp',
    },
    {
      name: 'sentry',
      title: 'Sentry',
      url: 'https://mcp.sentry.dev/mcp',
    },
  ],
} as const;
