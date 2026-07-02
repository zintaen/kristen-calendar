import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    // Vitest runs unit/integration tests only (*.test.*). Playwright e2e specs (*.spec.ts under tests/)
    // are run separately by `playwright test` - do NOT let vitest's default glob collect them, or it
    // throws "Playwright Test did not expect test() to be called here".
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/out/**", "**/tests/**/*.spec.ts"],
  },
});
