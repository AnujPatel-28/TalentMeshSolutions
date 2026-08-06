import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific scripts and temp folders:
    "scratch/**",
    "scripts/**",
    "tmp/**",
    "insforge/**",
    // Generated edge-function bundles: gitignored, so CI never sees them, but they
    // produced 33 lint errors on any local checkout that had run a bundle build.
    ".insforge-dist/**",
    "coverage/**",
    "*.js",
    "*.cjs",
    "*.mjs",
    "proxy.ts"
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/exhaustive-deps": "off",
      "no-unused-vars": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-expressions": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/rules-of-hooks": "off",
      "prefer-const": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/purity": "off",
      "jsx-a11y/alt-text": "off",
      "@next/next/no-html-link-for-pages": "off"
    }
  }
]);

export default eslintConfig;
