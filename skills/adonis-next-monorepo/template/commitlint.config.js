import { readdirSync } from 'node:fs'

/**
 * Conventional Commits: `<type>(<scope>): <subject>`, e.g. `feat(blogs): add comments`.
 * Branch names use the same types (scripts/check-branch-name.mjs).
 */
export const TYPES = [
  'feat',
  'fix',
  'refactor',
  'perf',
  'test',
  'docs',
  'build',
  'ci',
  'chore',
  'revert',
]

// Every API module is a scope automatically, e.g. feat(auth): …
const modules = readdirSync(new URL('./apps/api/app/modules', import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

export const SCOPES = [
  ...modules,
  // Workspaces
  'api',
  'web',
  'ui',
  'eslint-config',
  'typescript-config',
  // Repo-wide
  'repo',
  'deps',
  'ci',
  'docs',
]

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', TYPES],
    'scope-enum': [2, 'always', SCOPES],
    'scope-empty': [2, 'never'],
  },
}
