import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

