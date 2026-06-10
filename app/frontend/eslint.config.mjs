import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // No console.* in production code — use the structured logger instead.
      // Exceptions are handled via eslint-disable-next-line in logger.ts and story files.
      "no-console": "error",
    },
  },
  // Allow console.* in Storybook stories, test files, and scripts
  {
    files: [
      "**/*.stories.{ts,tsx,js,jsx}",
      "**/*.test.{ts,tsx,js,jsx}",
      "**/*.spec.{ts,tsx,js,jsx}",
      "**/scripts/**",
      "**/seed*.{ts,js}",
    ],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
