import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ["node_modules/**", ".next/**", "e2e/**", "**/__tests__/**"],
  },
];

export default eslintConfig;
