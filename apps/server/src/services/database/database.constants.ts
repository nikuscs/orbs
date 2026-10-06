export const DATABASE = {
  migrations: import.meta.glob<string>('./migrations/core/*.sql', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  tenantMigrations: import.meta.glob<string>('./migrations/tenant/*.sql', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
} as const;
