import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            { target: "./src/features/auth/**", from: "./src/features/office/**" },
            { target: "./src/features/auth/**", from: "./src/features/property/**" },
            { target: "./src/features/auth/**", from: "./src/features/coordination/**" },
            { target: "./src/features/office/**", from: "./src/features/auth/**" },
            { target: "./src/features/office/**", from: "./src/features/property/**" },
            { target: "./src/features/office/**", from: "./src/features/coordination/**" },
            { target: "./src/features/property/**", from: "./src/features/auth/**" },
            { target: "./src/features/property/**", from: "./src/features/office/**" },
            { target: "./src/features/property/**", from: "./src/features/coordination/**" },
            { target: "./src/features/coordination/**", from: "./src/features/auth/**" },
            { target: "./src/features/coordination/**", from: "./src/features/office/**" },
            { target: "./src/features/coordination/**", from: "./src/features/property/**" },
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
