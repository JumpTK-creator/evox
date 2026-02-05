import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["convex/**/*.ts", "lib/**/*.ts", "app/api/**/*.ts"],
      exclude: ["**/*.test.ts", "**/schema.ts", "**/_generated/**"],
    },
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
