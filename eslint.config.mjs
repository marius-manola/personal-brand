import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".content-studio/**",
      "app/content-studio/**",
      "app/api/content-studio/**",
      "lib/content-studio/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
