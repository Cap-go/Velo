import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.vitest.toml" },
        miniflare: {
          bindings: {
            APP_URL: "http://localhost:5173",
          },
        },
      },
    },
    include: ["tests/**/*.test.ts"],
  },
});
