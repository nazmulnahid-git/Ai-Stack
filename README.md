# Ai-Stack

Useful AI things an engineer actually uses daily — starting with agent skills.

Skills here are plain `SKILL.md` files, so they work with Claude Code, Cursor,
Codex, Copilot, and any other agent that reads the open skills format.

## Install

All skills:

```bash
npx skills@latest add nazmulnahid-git/Ai-Stack
```

One skill:

```bash
npx skills@latest add nazmulnahid-git/Ai-Stack --skill prodcheck
```

This drops the skill into your project's `.claude/skills/` (or your agent's
equivalent). Invoke with `/prodcheck`, `/prodtest`, `/mergemain`, or just
describe the task and let the agent pick.

### As a Claude Code plugin

Installs once at user level and stays updatable via `/plugin marketplace update`:

```
/plugin marketplace add nazmulnahid-git/Ai-Stack
/plugin install ai-stack@ai-stack
```

## Skills

| Skill | What it does |
| --- | --- |
| [`prodcheck`](skills/prodcheck/SKILL.md) | Senior-engineer production readiness review. Verifies every finding against the real code before reporting — security, tenant data isolation, N+1 and DB problems, concurrency, failure modes. Asks before it fixes anything. |
| [`prodtest`](skills/prodtest/SKILL.md) | Senior-QA pass on a new feature. Unit + functional/integration tests, then Playwright E2E with screenshots saved to a gitignored `.prodtest/` folder. Asks upfront whether to fix bugs or only report them. |
| [`mergemain`](skills/mergemain/SKILL.md) | Fetches main fresh, merges it into the current branch, and resolves conflicts by reading both sides in full context instead of picking a side. Escalates to you when intent is genuinely ambiguous. |
| [`shipit`](skills/shipit/SKILL.md) | Clean commits and PRs. Asks up front whether to use AI attribution or keep the commit fully human-authored, matches your repo's existing commit convention, and splits logical commits. Opens PRs as drafts, and updates the existing PR instead of opening a second one. |

## Layout

```
skills/
  <skill-name>/
    SKILL.md        # frontmatter: name + description, then the instructions
.claude-plugin/
  plugin.json       # plugin metadata (skills/ is auto-discovered)
  marketplace.json  # catalog entry, so /plugin install works too
```

Anything more than a `SKILL.md` (references, scripts, templates) goes inside
that skill's own folder.

## Adding a skill

1. `mkdir skills/<name>` and write a `SKILL.md`.
2. Frontmatter needs exactly two fields: `name` (lowercase, hyphens) and
   `description`. The description is what makes an agent decide to load the
   skill — write it as trigger conditions, not marketing.
3. Keep the body procedural: numbered steps, explicit rules, concrete output
   format. Say what the agent must *not* do.

## License

MIT
