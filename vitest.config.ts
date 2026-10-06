import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
    pool: "threads",
    maxWorkers: "100%",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["apps/server/src/**/*.ts"],
      exclude: [
        "apps/server/src/types/**",
        "apps/server/src/services/database/migrations/**",
        "apps/server/src/rpc/**",
        "apps/server/src/entry.*.ts",
        "apps/server/src/core/core.services.ts",
      ],
    },
  },
});
