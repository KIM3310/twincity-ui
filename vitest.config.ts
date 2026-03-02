import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Unit tests focus on the "hard parts" of this project:
// - payload normalization (multiple provider shapes -> one EventItem)
// - coordinate mapping (percent/world/bbox -> normalized 0..1)
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
