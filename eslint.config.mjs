import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    rules: {
      // TourAPI and provider payloads are runtime-validated dynamic JSON in Deno.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "frontend/dist/**",
    "frontend/node_modules/**",
    "next-env.d.ts",
    "apply-kakao-map.cjs",
  ]),
]);

export default eslintConfig;
