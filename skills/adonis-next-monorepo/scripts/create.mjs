#!/usr/bin/env node
/**
 * Creates a new monorepo from ../template.
 *
 *   node create.mjs <target-dir> --name <kebab-name> [--title "Title"] [--description "One line"]
 *
 * Placeholders filled in every text file:
 *   __NAME__        kebab-case name: package scope (@name/api), root package name
 *   __NAME_SNAKE__  snake_case name: Postgres user and databases
 *   __TITLE__       display name: README, AGENTS.md, page title
 *   __DESCRIPTION__ one-line description: README, page, metadata
 * `_gitignore` is renamed to `.gitignore` (kept undotted so tooling that
 * installs skills doesn't drop or apply it).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template')
const BINARY = new Set(['.ico', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2'])

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
  },
})

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const target = positionals[0]
const name = values.name
if (!target || !name) {
  fail('Usage: node create.mjs <target-dir> --name <kebab-name> [--title "Title"] [--description "…"]')
}
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  fail(`--name must be kebab-case (e.g. "acme" or "my-app"), got "${name}"`)
}
if (existsSync(target) && readdirSync(target).some((entry) => entry !== '.git')) {
  fail(`${target} exists and is not empty`)
}

const snake = name.replaceAll('-', '_')
const title =
  values.title ?? name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
const description = values.description ?? `${title} monorepo.`

/** Replaces placeholders; the description is escaped for TS strings and JSX text. */
function fill(source) {
  return source
    .replaceAll("'__DESCRIPTION__'", JSON.stringify(description))
    .replaceAll(/(>\s*)__DESCRIPTION__(\s*<)/g, (_, before, after) => {
      return `${before}{${JSON.stringify(description)}}${after}`
    })
    .replaceAll('__DESCRIPTION__', description)
    .replaceAll('__NAME_SNAKE__', snake)
    .replaceAll('__NAME__', name)
    .replaceAll('__TITLE__', title)
}

function copy(from, to) {
  if (statSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true })
    for (const entry of readdirSync(from)) {
      const destination = entry === '_gitignore' ? '.gitignore' : entry
      copy(path.join(from, entry), path.join(to, destination))
    }
    return
  }
  const contents = readFileSync(from)
  writeFileSync(to, BINARY.has(path.extname(from)) ? contents : fill(contents.toString('utf8')))
}

copy(TEMPLATE, target)
console.log(`Created ${title} (${name}) in ${path.resolve(target)}`)
