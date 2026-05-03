import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    exclude: ["node_modules/**", "dist/**", "build/**", ".next/**", "tests/**/*.spec.ts"],
  },
});
