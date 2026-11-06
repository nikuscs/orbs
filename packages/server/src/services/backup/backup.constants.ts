export const BACKUP = {
  version: 3,
  manifest: 'manifest.json',
  modes: {
    file: 0o600,
    exec: 0o700,
    directory: 0o700,
  },
  lock: 'data/daemon',
  files: {
    database: 'data/app.sqlite',
    credentials: 'data/credentials.key',
  },
  directories: {
    data: 'data',
    bots: 'data/bots',
    agents: 'agents',
  },
  botStore: /^data\/bots\/[0-9a-f-]{36}\/(runtime\.sql|carry\.json|mcp\.json)$/,
  excluded: {
    locks: true,
    ipc: true,
    providerAuth: 'Pi provider authentication lives outside the data root in the Pi agent directory and is not included.',
    sharedSources: 'Skill, plugin, and instruction paths outside the data root are not copied. Stored path strings remain in the app database.',
  },
} as const;
