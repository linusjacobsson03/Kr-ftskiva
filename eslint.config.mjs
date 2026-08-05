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
  ]),
  {
    rules: {
      // This app doesn't use a data-fetching library (SWR/React Query) — the
      // standard "fetch on mount, poll on an interval" pattern in plain
      // useEffect is used throughout for the live party feeds (challenges,
      // photos, leaderboard). That pattern trips this rule even though the
      // fetches are idempotent GETs, so it's downgraded rather than fought.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
