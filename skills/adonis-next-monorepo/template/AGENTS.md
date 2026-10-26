# __TITLE__: agent rules

Every convention in `docs/conventions.md` is a hard rule. Follow it on every change until the user explicitly allows an exception for the current task.

## Working rules

1. **Read before writing.** Read the `docs/conventions.md` section for the area you're changing, then the closest existing code of the same kind, and follow its pattern.
2. **Ask first** before adding or upgrading a dependency, introducing a pattern that `docs/conventions.md` doesn't describe, or changing the folder structure or a convention.
3. **Record decisions.** When a convention is added or changed, add or update its entry in `docs/conventions.md` (decision, why, implementing files) in the same change.
4. **Done means green:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and `pnpm test` pass from the repo root. Report any failure with its output.

## Generators

Create files with the project's generators so they start in the right shape:

- API feature module: `node ace make:module <name>` in `apps/api`, then `pnpm codegen`.
- Migration, model, factory, transformer: `node ace make:migration|model|factory|transformer` in `apps/api`.
- UI component: `pnpm dlx shadcn@latest add <name>` in `apps/web` (lands in `packages/ui`).

## Gotchas

- TypeScript stays on 6.0 (AdonisJS and typescript-eslint don't support 7).
- The web client is keyed by route name: `api.<module>.<action>` (e.g. `api.auth.login`). Name every route with `.as()`.
- Return responses from controller methods via `serialize()`. Tuyau types route closures as `unknown`.
- Commits are `<type>(<scope>): <subject>`, where scope is an API module, a workspace (`api`, `web`, `ui`, …) or `repo`/`deps`/`ci`/`docs`. Branches are `<type>/<kebab-description>`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
