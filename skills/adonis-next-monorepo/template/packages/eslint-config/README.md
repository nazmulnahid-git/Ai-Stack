# `@__NAME__/eslint-config`

The one ESLint config for the repo. Each workspace's `eslint.config.js` calls one preset:

| Preset          | Used by       | Adds on top of `base`                                     |
| --------------- | ------------- | --------------------------------------------------------- |
| `adonis`        | `apps/api`    | snake_case files/folders, module boundaries               |
| `next`          | `apps/web`    | React + Next.js rules, kebab-case files, route boundaries |
| `react-library` | `packages/ui` | React rules, kebab-case files, no imports from apps       |

`base.js` holds the shared rules (type-aware typescript-eslint, import sorting, naming, no barrel files) and ends with `eslint-config-prettier`, so ESLint never reports formatting. `rules.js` holds the project's custom structure rules.
