/**
 * Branch names: <type>/<kebab-case-description>, e.g. feat/blog-comments.
 * Types are the commit types from commitlint.config.js. Runs in the pre-push
 * hook and in CI (`node scripts/check-branch-name.mjs <branch>`).
 */
import { execSync } from 'node:child_process'

import { TYPES } from '../commitlint.config.js'

const EXEMPT = [/^main$/, /^dependabot\//]

const branch = process.argv[2] ?? execSync('git branch --show-current').toString().trim()
const pattern = new RegExp(`^(${TYPES.join('|')})/[a-z0-9]+(-[a-z0-9]+)*$`)

if (branch && !EXEMPT.some((exempt) => exempt.test(branch)) && !pattern.test(branch)) {
  console.error(
    `Branch "${branch}" doesn't follow <type>/<kebab-description>, e.g. feat/blog-comments.\n` +
      `Types: ${TYPES.join(', ')}. Rename it with: git branch -m <new-name>`
  )
  process.exit(1)
}
