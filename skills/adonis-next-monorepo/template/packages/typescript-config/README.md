# `@__NAME__/typescript-config`

Shared, strict TypeScript presets. Every workspace extends one of them:

| Preset               | Used by       |
| -------------------- | ------------- |
| `adonis.json`        | `apps/api`    |
| `nextjs.json`        | `apps/web`    |
| `react-library.json` | `packages/ui` |

All presets extend `base.json`, which holds the strictness flags. Change strictness there, never in a workspace.
