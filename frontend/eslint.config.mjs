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
    // components/ui/** is shadcn/ui-generated boilerplate (see
    // components.json), added via `npx shadcn add <block>` and never
    // hand-edited — e.g. sidebar.tsx's Math.random() skeleton-width call
    // trips react-hooks' purity check, which is a real rule for code we
    // author but not a bug in shadcn's own upstream component. Excluding
    // the folder keeps it lint-clean without patching vendored source,
    // so a future `shadcn add` update stays a clean diff.
    "components/ui/**",
  ]),
]);

export default eslintConfig;
