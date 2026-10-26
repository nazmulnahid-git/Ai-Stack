/**
 * Migrations that have run are never edited: only new migration files may be
 * added. Fails if an existing file in apps/api/database/migrations is modified,
 * renamed or deleted.
 *
 *   node scripts/check-migrations.mjs            staged changes (pre-commit hook)
 *   node scripts/check-migrations.mjs <base-ref>  changes since <base-ref> (CI)
 */
import { execSync } from 'node:child_process'

const base = process.argv[2]
const diff = base ? `git diff --name-status ${base}...HEAD` : 'git diff --cached --name-status'

const changed = execSync(`${diff} -- apps/api/database/migrations`)
  .toString()
  .split('\n')
  .filter(Boolean)
  .filter((line) => !line.startsWith('A'))

if (changed.length) {
  console.error(
    'Existing migrations must not be modified, renamed or deleted. Create a new migration instead\n' +
      '(node ace make:migration <name>):\n' +
      changed.map((line) => `  ${line}`).join('\n')
  )
  process.exit(1)
}
