# Conventions and decision log

Every convention in this repo, why we chose it, and which files implement it. Once a convention is set, it is followed until it is changed here. New decisions are added as they are made.

Each entry: **Decision** · **Why** · **Implemented in**.

---

## 1. Tooling

### 1.1 pnpm workspaces + Turborepo

- **Decision:** pnpm is the only package manager. Every repo-wide command (`dev`, `build`, `lint`, `typecheck`, `test`, `format`, `codegen`) runs from the root through Turborepo.
- **Why:** one entry point for humans, CI and AI agents. Turborepo orders tasks (codegen before typecheck) and caches results.
- **Implemented in:** `package.json` (scripts, `packageManager`), `pnpm-workspace.yaml`, `turbo.json`.

### 1.2 TypeScript 6.0, pinned

- **Decision:** `typescript@~6.0.3` in every workspace and at the root, not 7.x.
- **Why:** `@adonisjs/assembler` supports TS 5/6 only, typescript-eslint supports `<6.1`, and TS 7 drops the compiler API that `next build` uses.
- **Implemented in:** every `package.json` (`devDependencies.typescript`).

### 1.3 Strict shared tsconfig presets

- **Decision:** every workspace extends a preset from `packages/typescript-config`: `adonis.json` (api), `nextjs.json` (web), `react-library.json` (ui). All extend `base.json`, which turns on `strict`, `noUncheckedIndexedAccess` and `noFallthroughCasesInSwitch`. Strictness is changed only in `base.json`.
- **Why:** one strictness level everywhere. It also matters technically: `apps/web` typechecks backend sources through the Tuyau registry, so web and api must use the same flags.
- **Not enabled, on purpose:**
  - `noImplicitOverride`: AdonisJS generators (`make:migration`, the exception handler) emit overrides without the keyword, and run migrations can't be edited.
  - `noUnusedLocals`/`noUnusedParameters`: they fail on Next.js's generated `.next/types` files. Unused code is caught by ESLint's `@typescript-eslint/no-unused-vars` instead, which skips generated files and allows `_`-prefixed names.
- **Implemented in:** `packages/typescript-config/*.json`, each workspace's `tsconfig.json`.

### 1.4 One shared ESLint config

- **Decision:** `packages/eslint-config` is the only ESLint config. Each workspace's `eslint.config.js` is one line calling a preset with `import.meta.dirname`: `adonis` (api), `next` (web), `reactLibrary` (ui).
- **Shared rules (`base.js`):**
  - typescript-eslint `recommendedTypeChecked` + `stylisticTypeChecked` (type-aware: catches un-awaited promises).
  - Import sorting with `simple-import-sort` (autofixable), `consistent-type-imports`.
  - No `../` imports. Use the workspace alias: `#…` in api, `@/…` in web, `@__NAME__/ui/…` in ui. The one exception is `../.adonisjs/…`, AdonisJS's generated output.
  - No barrel files (`check-file/no-index`).
  - Naming: camelCase by default. PascalCase for types, classes, React components and lazily imported controllers. UPPER_CASE allowed for constants. Object keys aren't checked, because they mirror external shapes (headers, DB columns, route names).
  - `eqeqeq`, no `console.log` (use the logger), unused vars are errors unless prefixed `_`.
  - `eslint-config-prettier` last, so ESLint never reports formatting.
- **Framework exceptions, scoped to the files that need them:**
  - `require-await` is off: AdonisJS migrations and controllers are async by contract.
  - Empty `interface X extends Y {}` is allowed: AdonisJS types its config through declaration merging.
  - api `app/middleware` and `app/exceptions`: `no-unsafe-return` is off, because `next()` and `super.handle()` are typed `any`.
  - api `bin/`: the promise rules are off, because the entrypoints start the app with intentionally un-awaited promises.
- **Why:** consistent code regardless of who wrote it, and every rule is an error, not a warning. This replaces `@adonisjs/eslint-config`, which formats through `eslint-plugin-prettier` (ESLint and Prettier fighting), and the shadcn scaffold's Babel parser and `only-warn` plugin.
- **Implemented in:** `packages/eslint-config/{base,adonis,next,react-library}.js`, `apps/*/eslint.config.js`, `packages/ui/eslint.config.js`.

### 1.5 Structure rules as custom ESLint rules

- **Decision:** the folder structure is enforced by two small custom rules, not a third-party boundaries plugin:
  - `project/module-boundaries` (api): `app/modules/<a>/…` may import `app/modules/<b>/…` only through `<b>.service`.
  - `project/module-file-names` (api): files in `app/modules/<name>/` must be named `<name>.<routes|controller|service|validator>.ts`.
  - `project/route-private-components` (web): a route's `_components` folder can only be imported from inside that route segment.
- **Also enforced:**
  - File and folder naming via `eslint-plugin-check-file`: snake_case in api (AdonisJS generator convention), kebab-case in web and ui, App Router naming inside `app/`. Migrations follow `<timestamp>_<snake_name>.ts`.
  - `packages/ui` may not import from apps, Next.js, TanStack or Tuyau (`no-restricted-imports`).
- **Why:** `eslint-plugin-boundaries` v7 has a new policy syntax that couldn't cleanly express "only another module's service file". About 100 lines of plain rules are easier to read, have no dependencies, and carry over to new projects unchanged.
- **Implemented in:** `packages/eslint-config/rules.js`, the presets above.

### 1.6 Prettier and .editorconfig

- **Decision:** one root `.prettierrc`: no semicolons, single quotes, trailing commas (es5), width 100, Tailwind class sorting (`cn`, `cva`). `.editorconfig` matches it. `pnpm format` / `pnpm format:check` run Prettier once over the whole repo as Turborepo root tasks (`//#prettier:write`, `//#prettier:check`).
- **Why:** formatting is never discussed in review. One pass from the root also covers root files (README, configs) that belong to no workspace.
- **Implemented in:** `.prettierrc`, `.prettierignore`, `.editorconfig`, `package.json`, `turbo.json`.

### 1.7 Task graph

- **Decision:** `typecheck` and `lint` depend on `codegen` (own and upstream). `build` depends on upstream `build`. `test` and `dev` have no dependencies, because `node ace test`/`serve` run codegen themselves.
- **Why:** type-aware lint and typecheck need AdonisJS's generated `.adonisjs/` types, which are gitignored. Running codegen in parallel with a task that also runs it would race on the same files.
- **Env vars:** Turborepo 2 runs tasks in strict env mode, so only declared variables reach a task. The API's runtime variables are listed in `globalPassThroughEnv`: they reach tasks without changing cache keys, because the API build doesn't embed them. `NEXT_PUBLIC_*` and `NODE_ENV` are in `build.env`, because they change the web build output. Locally this is invisible (AdonisJS reads `apps/api/.env` itself); in CI it's the difference between passing and failing.
- **Implemented in:** `turbo.json`.

### 1.8 VS Code workspace settings

- **Decision:** committed `.vscode/settings.json` (Prettier as default formatter, format on save, ESLint fix on save, workspace TypeScript, non-relative auto-imports, Tailwind IntelliSense) and `.vscode/extensions.json`. All other `.vscode/` files stay ignored.
- **Why:** the editor applies the same conventions on save that CI checks.
- **Implemented in:** `.vscode/settings.json`, `.vscode/extensions.json`, `.gitignore`.

---

## 2. Backend (`apps/api`)

### 2.1 Feature modules

- **Decision:** one folder per feature in `app/modules/<name>/` containing exactly `<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts` and `<name>.validator.ts`, until a real need for more appears. A module without input (e.g. `health`) has no validator. Module names are snake_case; URLs are the dash-case form (`blog_posts` → `/api/v1/blog-posts`). Functional tests live in `tests/functional/<name>.spec.ts`.
- **File naming:** every module file carries the module name as a prefix and its role as a suffix (`auth.routes.ts`, `auth.controller.ts`, …). Tabs and search results are unambiguous, and the role is visible in the name. Lint enforces it (`project/module-file-names`). Adding a new kind of module file means changing `MODULE_FILE_KINDS` in `packages/eslint-config/rules.js`, which is a convention change and gets an entry here. Files outside modules keep AdonisJS's generator names (`user.ts`, `user_transformer.ts`).
- **Shared, not per module:** Lucid models (`app/models`), transformers (`app/transformers`, which feed Tuyau's `Data` types), middleware and the exception handler. Several modules use them, and AdonisJS's generators and codegen expect them there.
- **Why:** everything about a feature is in one place, with a fixed shape anyone can navigate.
- **Implemented in:** `app/modules/*`, `package.json` (`#modules/*` alias; `#controllers/*`, `#validators/*` and `#services/*` removed).

### 2.2 Modules are generated, never hand-made

- **Decision:** `node ace make:module <name>` creates the four module files and a functional test from `stubs/make/module/*.stub`, registers the module in `start/routes.ts` (sorted import plus a call inside the `/api/v1` group), and formats everything with the repo's Prettier config. `start/routes.ts` contains only those registrations.
- **The generated sample endpoint** is `GET /<name>`. It shows every layer working: an authenticated route, a validator for `page`/`perPage`, a service, a serialized response, and two tests (success, 401). Replace the service's placeholder with a Lucid query.
- **Gotchas found while building it:**
  - Tempura stubs can't contain backticks; they compile to JS template literals.
  - AdonisJS trims stub output, so files lose their final newline. That's why the command runs Prettier.
- **Why:** identical structure for every module, and no step can be forgotten (route registration, test file).
- **Implemented in:** `commands/make_module.ts`, `stubs/make/module/*.stub`, `start/routes.ts`.

### 2.3 Thin controllers, services, validators

- **Decision:**
  - Controllers validate input (`request.validateUsing`), call their service and return `serialize(...)`. Nothing else.
  - Business logic lives in the module's service: a default-exported class injected with `@inject()`.
  - All input goes through a VineJS validator. Service methods take `Infer<typeof validator>`.
  - Another module is reached only through its service (enforced by `project/module-boundaries`).
- **Why:** controllers stay readable and services stay testable and reusable across modules.
- **Implemented in:** `app/modules/*`, `stubs/make/module/{controller,service,validator}.stub`.

### 2.4 Routes lazy-load controllers

- **Decision:** module routes reference controllers with `const XController = () => import('#modules/x/x.controller')`. The generated controllers index is turned off (`indexEntities({ controllers: { enabled: false } })`). Every route is named via the group's `.as(<module>)` plus `.as(<action>)`.
- **Why:** a new route works without running codegen first. The old `controllers.X` index only existed after codegen, so a fresh route crashed the app until it ran. Tuyau keys the web client by route name, so names are required.
- **Implemented in:** `app/modules/*/*.routes.ts`, `adonisrc.ts`.

### 2.5 One response shape

- **Decision:**
  - Success: `{ "data": … }`. Paginated responses add `"metadata"` (Lucid paginator keys).
  - Failure: `{ "errors": [{ "code", "message", "field"?, "rule"?, "meta"? }] }` for every error: validation (422), auth (401), bad credentials (400), not found (404) and server errors (500, message hidden in production).
  - Controllers return `serialize(...)`. Lists and model data go through a transformer. Raw arrays are wrapped too.
- **Why:** clients handle one shape. The error format is a superset of VineJS's, so Tuyau's generated 422 types stay accurate.
- **Gotcha:** AdonisJS's `serialize()` passes raw arrays through unwrapped. `providers/api_provider.ts` wraps them at runtime and adds a typed overload, so the rule holds without anyone remembering it.
- **Implemented in:** `app/exceptions/handler.ts` (`ApiError`), `providers/api_provider.ts`.

### 2.6 Authentication by default

- **Decision:** every route uses exactly one of two named middleware: `middleware.auth()` (the default in the module stub) or `middleware.public()` (a no-op marker for intentionally public routes). `tests/functional/routes.spec.ts` reads the router and fails on any route with neither, naming it.
- **Why:** AdonisJS has no route metadata for "public". A marker plus a test makes forgetting auth a failing test, not a security hole.
- **Implemented in:** `app/middleware/public_middleware.ts`, `start/kernel.ts`, `tests/functional/routes.spec.ts`.

### 2.7 Tests

- **Decision:**
  - At least one Japa functional test per route.
  - Tests run against the `__NAME_SNAKE___test` database, which is migrated once per run (`runnerHooks.setup`) and isolated per test with `withGlobalTransaction()`.
  - Users come from `UserFactory` (Lucid factories, faker ships with Lucid).
  - Authenticated requests use `.loginAs(user)`.
  - Requests use the typed `client.visit('<route.name>')`. A deliberately invalid body is marked with `@ts-expect-error`.
- **Why:** tests exercise the real HTTP contract, including the response shape and auth.
- **Implemented in:** `tests/bootstrap.ts`, `tests/functional/*.spec.ts`, `database/factories/user_factory.ts`, `apps/api/.env.test`.

### 2.8 Migrations

- **Decision:**
  - Migrations are created with `node ace make:migration` (`<timestamp>_create_<table>_table.ts`, enforced by lint).
  - Tables are plural snake_case. Columns are snake_case. Foreign keys are `<singular>_id`. Booleans start with `is_`/`has_`. `created_at`/`updated_at` are timestamps.
  - A migration that has run is never edited. Change the schema with a new migration.
  - `database/schema.ts` is regenerated by `migration:run` and is excluded from Prettier and ESLint.
- **Why:** an edited migration silently diverges from databases where it already ran.
- **Implemented in:** lint naming rule (`packages/eslint-config/adonis.js`), the guard in §4.

---

## 3. Frontend (`apps/web`, `packages/ui`)

### 3.1 Folder layout

- **Decision:**
  ```
  apps/web/
    app/                        routing only: page.tsx, layout.tsx, error.tsx, not-found.tsx
      <segment>/page.tsx        a page and its server-side pieces, in one file
      <segment>/_components/    the route's client components, and pieces a 2nd file
                                in the route needs (or once page.tsx passes ~300 lines)
    components/                 app-specific components used by 2+ routes, plus app-wide
                                infrastructure (providers, theme-provider, query-state)
    hooks/                      app hooks used by 2+ places (created when first needed)
    lib/                        api.ts (Tuyau client), env.ts (validated env), errors.ts
  packages/ui/src/
    components/                 shadcn components on Base UI
    lib/, hooks/, styles/globals.css (Tailwind theme)
  ```
- **Rules:**
  - A component, hook or helper starts in the file that uses it and moves out only when a second place needs it or the file passes ~300 lines.
  - Client components need their own file (`'use client'`), so a page's client parts go in its `_components/`.
  - Route groups (`(app)`, `(auth)`) organize routes without changing URLs.
- **Why:** where a file lives tells you who uses it. `project/route-private-components` keeps `_components` private to their route.
- **Implemented in:** `apps/web/app`, `apps/web/components`, `apps/web/lib`, `packages/eslint-config/{next,rules}.js`.

### 3.2 Shared UI vs app components

- **Decision:**
  - `packages/ui` holds generic, app-agnostic building blocks: shadcn components (Base UI primitives), the Tailwind theme and `cn`. It never fetches data, never uses API types and never imports Next.js; lint enforces this.
  - Anything that knows about __TITLE__ data or routes lives in `apps/web`.
  - Add shadcn components from `apps/web` (`pnpm dlx shadcn@latest add <name>`); they land in `packages/ui/src/components` and are imported as `@__NAME__/ui/components/<name>`.
  - Third-party UI helpers are re-exported from their ui component (`toast` from `@__NAME__/ui/components/sonner`), so apps depend on `@__NAME__/ui`, not on the library.
- **Why:** the design system can be reused or swapped without touching app logic.
- **Implemented in:** `packages/ui`, `packages/eslint-config/react-library.js`, `apps/web/components.json`.

### 3.3 One way to fetch data

- **Decision:**
  - **Reads:** `useQuery(api.<module>.<action>.queryOptions(...))`, called directly in the component. Wrap it in a custom hook only when a second place needs the same query.
  - **Rendering a query:** always through `<QueryState query={q}>{({ data }) => …}</QueryState>`. It shows a skeleton while loading (override with `loading`), the API's error message with a Retry button on failure, and the response on success. Responses keep the API envelope, so children destructure `{ data }` (and `metadata` when paginated).
  - **Writes:** `useMutation(api.<module>.<action>.mutationOptions({ onSuccess }))`. Failed mutations show a toast with the API's message automatically (QueryClient `mutationCache`).
  - **Retries:** queries retry server and network errors up to twice, never 4xx.
  - **Crashes:** a rendering crash is caught by `app/error.tsx`. Failed requests never reach it.
  - **Where fetching happens:** in the browser, not in server components. The API is on another origin and authenticated, so server components can't fetch user data without forwarding credentials. Revisit for public, SEO-relevant pages.
- **Why:** every screen behaves the same way, and no component writes its own loading/error handling.
- **Implemented in:** `apps/web/lib/api.ts`, `apps/web/components/query-state.tsx`, `apps/web/components/providers.tsx`, `apps/web/lib/errors.ts`, `apps/web/app/error.tsx`.

### 3.4 API errors on the client

- **Decision:** `getErrorMessage(error)` turns any failed request into a user-facing message. HTTP errors return the API's first `errors[].message`; network failures and unknown errors get fixed messages. The `ApiError` type is imported from the API (`@__NAME__/api/errors`), so the shape has one source of truth.
- **Why:** consistent messages, and the error contract can't drift between api and web.
- **Implemented in:** `apps/web/lib/errors.ts`, `apps/api/package.json` (`exports["./errors"]`).

### 3.5 Validated environment variables

- **Decision:** `apps/web/lib/env.ts` validates env vars with zod. `next.config.ts` imports it, so `next dev`/`next build` fail on a missing or invalid value. Code reads `env.X`, never `process.env.X`. Each `NEXT_PUBLIC_*` var is referenced literally in `env.ts` so Next.js inlines it. The API validates its own in `start/env.ts`. Every app has a `.env.example`.
- **Why:** misconfiguration fails at startup, not at the first request that needs the value.
- **Implemented in:** `apps/web/lib/env.ts`, `apps/web/next.config.ts`, `apps/api/start/env.ts`, `apps/*/.env.example`.

---

## 4. Git

### 4.1 Conventional Commits with project scopes

- **Decision:** commit messages are `<type>(<scope>): <subject>`, checked by commitlint.
  - Types: `feat fix refactor perf test docs build ci chore revert`.
  - A scope is required. Allowed scopes are every API module (read from `apps/api/app/modules` on each run, so a new module is a valid scope immediately), the workspaces `api web ui eslint-config typescript-config`, and the repo-wide `repo deps ci docs`.
- **Why:** the history reads by feature and app, and a changelog can be generated later.
- **Implemented in:** `commitlint.config.js`, `.husky/commit-msg`.

### 4.2 Branch names

- **Decision:** `<type>/<kebab-description>` with the commit types, e.g. `feat/blog-comments`. `main` and `dependabot/*` are exempt. Checked on pre-push and in CI.
- **Implemented in:** `scripts/check-branch-name.mjs`, `.husky/pre-push`, `.github/workflows/ci.yml`.

### 4.3 Hooks

- **Decision:** Husky, installed by `pnpm install` (`prepare`).
  - **pre-commit** runs lint-staged _sequentially_ (codegen → `eslint --fix` → `prettier --write` on staged files), then the migration guard.
  - **commit-msg** runs commitlint.
  - **pre-push** checks the branch name.
- **Gotcha:** lint-staged runs globs in parallel by default, which races codegen against type-aware ESLint, and ESLint against Prettier on the same file. Hence `--concurrent false`.
- **Implemented in:** `.husky/*`, `lint-staged.config.js`, root `package.json` (`prepare`).

### 4.4 Migration guard

- **Decision:** a commit or PR that modifies, renames or deletes an existing file in `apps/api/database/migrations` fails. Only added files pass.
- **Why:** turns "never edit a migration that has run" (§2.8) into a check.
- **Implemented in:** `scripts/check-migrations.mjs` (staged mode for the hook, `<base-ref>` mode for CI).

### 4.5 Pull requests

- **Decision:** PRs use the template: what, why, how to test, and a checklist (tests per route, new migration instead of edits, `.env.example` updated, conventions log updated, screenshots).
- **Implemented in:** `.github/pull_request_template.md`.

---

## 5. CI and dependencies

### 5.1 GitHub Actions

- **Decision:** `.github/workflows/ci.yml` runs on every PR and on pushes to `main`. Two jobs:
  - **Conventions** (PRs only): branch name, commit messages (skipped for Dependabot, whose commit bodies break the line-length rule), migration guard against the PR base.
  - **Checks:** a Postgres 18 service, pnpm store cache, Turborepo cache (`.turbo/cache`), then format check, lint, typecheck, test and build.
- **Env:** the API's variables are set in the workflow with CI-only values (no secrets). `NODE_ENV` is set per step, because `next build` fails while prerendering when `NODE_ENV=development`.
- **Verified:** by running every step in a fresh clone with only the CI env vars and no `.env` files or generated types. The first workflow run happens on the first push.
- **Implemented in:** `.github/workflows/ci.yml`.

### 5.2 Dependabot

- **Decision:** weekly updates for all workspaces (`/`, `/apps/*`, `/packages/*`) and GitHub Actions. Minor and patch updates are grouped. Commits are `chore(deps): …` / `ci(deps): …`. TypeScript updates beyond 6.0 are ignored (§1.2).
- **Implemented in:** `.github/dependabot.yml`.

---

## 6. AI working rules

- **Decision:** `AGENTS.md` (read by Claude Code, Cursor, Codex and others) holds the rules every agent follows:
  - Conventions are hard rules; breaking one needs the user's explicit permission for that task.
  - Read similar code first and follow its pattern.
  - Ask before adding a dependency, introducing a pattern or changing the structure.
  - A task is done only when format check, lint, typecheck and tests pass.
  - Record every decision here.

  `AGENTS.md` points here instead of repeating the conventions, so this file stays the single source of truth. `CLAUDE.md` holds Claude-specific project facts and imports `AGENTS.md`. Next.js's managed block at the end of `AGENTS.md` is left as `next dev` writes it.

- **Why:** AI-written code follows the same conventions as human-written code, and the checks catch it when it doesn't.
- **Implemented in:** `AGENTS.md`, `CLAUDE.md`.
