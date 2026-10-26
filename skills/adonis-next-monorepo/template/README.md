# __TITLE__

__DESCRIPTION__

## Stack

| Layer    | Choice                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Monorepo | pnpm workspaces + Turborepo                                            |
| Language | TypeScript 6.0 everywhere (strict)                                     |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, TanStack Query 5    |
| UI kit   | shadcn components on [Base UI](https://base-ui.com) (`@base-ui/react`) |
| Backend  | AdonisJS 7 (Lucid ORM, VineJS, auth), Tuyau for the typed API client   |
| Database | PostgreSQL 18 (Docker Compose for local dev)                           |

## Layout

```
apps/
  api/                  @__NAME__/api   AdonisJS API on :3333
    app/modules/<name>/ one folder per feature: <name>.{routes,controller,service,validator}.ts
  web/                  @__NAME__/web   Next.js app on :3000
    app/                routes; a route's client components live in its _components/
    components/ lib/    shared app components; API client, env, error helpers
packages/
  ui/                   @__NAME__/ui    shared components and Tailwind theme
  eslint-config/        @__NAME__/eslint-config      the one ESLint config
  typescript-config/    @__NAME__/typescript-config  strict tsconfig presets
docs/conventions.md     every convention and why we chose it
docker-compose.yml      Postgres (databases: __NAME__, __NAME_SNAKE___test)
```

## Getting started

Requires Node 24+, pnpm 11+ and Docker. Open the repo in VS Code and install the recommended extensions when prompted: format on save and ESLint fixes are preconfigured.

```bash
pnpm install                                 # also installs the git hooks
pnpm db:up                                   # start Postgres

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @__NAME__/api exec node ace generate:key
pnpm --filter @__NAME__/api exec node ace migration:run

pnpm dev                                     # api on :3333, web on :3000
```

Both apps validate their environment variables at startup and refuse to start with a missing or invalid value.

## Scripts

Run from the repo root.

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Run the API and web app in watch mode                     |
| `pnpm build`        | Production build of every workspace                       |
| `pnpm lint`         | ESLint across the repo                                    |
| `pnpm typecheck`    | Regenerate API types, then typecheck every workspace      |
| `pnpm test`         | API functional tests (Japa) against `__NAME_SNAKE___test`       |
| `pnpm format`       | Format the repo with Prettier (`format:check` to verify)  |
| `pnpm codegen`      | Regenerate the API's Tuyau types without starting the API |
| `pnpm db:up`/`down` | Start or stop Postgres                                    |

## Conventions

The full list, with the reasoning behind each, is in [docs/conventions.md](docs/conventions.md). A convention is followed until it is changed there. The essentials:

- **Keep it together.** A component, hook or helper lives in the file that uses it until a second place needs it or the file passes ~300 lines. No barrel `index.ts` files.
- **API modules are generated:** `node ace make:module <name>` (in `apps/api`) creates the routes, controller, service, validator and a functional test, and registers the routes. Controllers stay thin, logic lives in services, and all input goes through validators. A module reaches another module only through its service.
- **One response shape:** `{ data }` on success, `{ errors: [{ code, message, field? }] }` on failure.
- **Routes require auth** unless marked `middleware.public()`. A test fails on any route without a marker.
- **Never edit a migration that has run.** Add a new one (`node ace make:migration`).
- **Frontend data:** `useQuery(api.<module>.<action>.queryOptions())` rendered through `<QueryState>`, and `useMutation(...mutationOptions())` for writes. Failed mutations toast the API's message.
- **Shared UI** goes in `packages/ui` (generic, no data fetching); anything app-specific stays in `apps/web`.

ESLint enforces the structure (module boundaries, route-private components, file naming), and Prettier owns formatting.

### The typed API

`pnpm codegen` (also run by `dev`, `build`, `test` and `typecheck`) generates the API's route registry into `apps/api/.adonisjs/` (gitignored). The web app builds its clients from it in [apps/web/lib/api.ts](apps/web/lib/api.ts), keyed by route name:

```tsx
const health = useQuery(api.health.show.queryOptions())
```

Request bodies, params and responses are inferred from the API's controllers and validators, so a backend change that breaks the frontend fails `pnpm typecheck`.

## Contributing

1. Branch from `main` as `<type>/<kebab-description>`, e.g. `feat/blog-comments` or `fix/login-redirect`.
2. Commit as `<type>(<scope>): <subject>`, e.g. `feat(auth): add password reset`. Types: `feat fix refactor perf test docs build ci chore revert`. Scope is an API module, a workspace (`api`, `web`, `ui`, `eslint-config`, `typescript-config`) or `repo`, `deps`, `ci`, `docs`.
3. Open a PR using the template. CI runs format check, lint, typecheck, tests and build, and checks the branch name, commit messages and migrations.

Git hooks run on your machine:

- **pre-commit:** lints and formats staged files, and blocks edits to existing migrations.
- **commit-msg:** checks the message format.
- **pre-push:** checks the branch name.

