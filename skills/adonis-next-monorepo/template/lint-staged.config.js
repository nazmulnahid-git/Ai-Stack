/**
 * Runs on `git commit` (pre-commit hook) against staged files only, in order
 * (the hook passes --concurrent false): codegen, ESLint, then Prettier.
 */
export default {
  // Type-aware lint rules read the API's generated types
  '{apps,packages}/**/*.{ts,tsx}': () => 'pnpm --filter @__NAME__/api codegen',
  '{apps,packages}/**/*.{ts,tsx,js,mjs,cjs}': 'eslint --fix --max-warnings=0 --no-warn-ignored',
  '*': 'prettier --write --ignore-unknown',
}
