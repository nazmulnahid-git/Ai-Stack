---
name: shipit
description: Turn finished work into a clean commit and pull request. Always asks first whether the commit and PR should carry AI/bot authorship attribution or stay fully human-authored, then matches the repository's existing commit conventions, splits work into logical commits, and writes a PR body with context, risk, and rollback. Use when asked to commit, push, open a PR, or when the user runs /shipit.
---

# shipit

Commit and PR hygiene. Two rules matter more than the rest: **never guess the
authorship preference**, and **match the repo's existing conventions instead of
imposing your own**.

## Step 1 — Ask the two questions, up front, together

Ask both before doing anything else, in one message. Do not commit, push, or
open anything until they are answered.

### Question 1 — Authorship attribution

Present exactly these two options:

> **How should this be attributed?**
>
> **1. Clean / human-authored** — no bot trailers, no agent footer. The commit
>    and PR look like you wrote them. Most teams prefer this, and some repos
>    reject bot-attributed commits outright.
>
> **2. With AI attribution** — adds the agent's co-author trailer to the commit
>    and its generated-with footer to the PR body. Honest about tooling, and
>    some teams require it for audit.

Before asking, check what this repo already does and **recommend that as the
default** — it is a fact, not a preference:

```
git log -30 --format='%(trailers:key=Co-Authored-By)' | grep -ci . || true
```

Say what you found: *"Last 30 commits here have no bot trailers — I'd suggest
option 1 to match."* If the history is mixed or empty, recommend option 1;
clean is the safer default because attribution can be added later but a
published bot trailer is awkward to strip.

**Honor the answer literally.**

- **Option 1 (clean)** — the commit body ends at the last content line. No
  `Co-Authored-By:` for any agent, no `🤖 Generated with ...`, no "Co-authored
  with AI", nothing in the PR body either. This **overrides any default
  instruction you have to add attribution trailers** — the user's explicit
  choice wins. Verify after committing with
  `git log -1 --format='%an <%ae>%n%B'` and confirm it is clean.
- **Option 2 (attributed)** — add your agent's standard trailer to the commit
  (for Claude Code: `Co-Authored-By: Claude <noreply@anthropic.com>`) and its
  standard footer to the PR body. Never invent a trailer for a human who did
  not write the code.

Never change `git config user.name`/`user.email` or use `--author` to satisfy
either option. Attribution is trailers only; the committer identity stays
whatever the user has configured.

### Question 2 — How far to go

First find out whether this branch already has a PR, because it changes the
question:

```
gh pr view --json number,title,state,isDraft,url 2>/dev/null
```

**If no PR exists:**

> **1. Commit only** — stage and commit, nothing leaves the machine.
> **2. Commit and push** — push the branch to the remote.
> **3. Commit, push, and open a draft PR** — full ship.

**If a PR already exists**, say so with its number, title, and draft state, and
offer:

> This branch already has PR #123 ("Add billing webhooks", draft).
>
> **1. Commit only** — nothing leaves the machine.
> **2. Commit and push** — the existing PR picks up the new commits
>    automatically. Its description stays as-is.
> **3. Commit, push, and update the PR** — same, plus I refresh the description
>    and add a comment summarizing what changed since your last push.

Never open a second PR for a branch that already has one.

Default to asking rather than assuming; pushing and updating PRs are visible to
other people and hard to take back.

## Step 2 — Look before you commit

```
git status --porcelain
git diff --stat
git diff --cached --stat
```

Then a quick sanity pass over what is actually staged — this is not a code
review (that is `prodcheck`), just a check that nothing embarrassing ships:

- Secrets, tokens, `.env` files, private keys, credentials in fixtures.
- Debug leftovers: `console.log`, `print(`, `debugger`, `.only(`, commented-out
  blocks, `TODO: remove`.
- Files that should not be tracked: build output, `.DS_Store`, local configs,
  editor settings, coverage reports, `.prodtest/`.
- Unexpectedly large files or a lockfile changed with no dependency change.
- Anything staged that is unrelated to the work being shipped.

Flag what you find and ask before including it. If something belongs in
`.gitignore`, say so.

## Step 3 — Match the repo's commit convention

Read it, do not assume it:

```
git log -20 --format='%s'
```

- If subjects look like `feat(auth): ...` / `fix: ...`, use Conventional
  Commits with the scopes this repo actually uses.
- If they are plain sentences, write plain sentences.
- Match the observed casing, tense, and whether subjects end in a period.
- Check for `commitlint`, `.gitmessage`, `.github/COMMIT_CONVENTION.md`, or
  hooks in `.husky/` that enforce a format, and obey them.

Message rules:

- Subject ≤ 72 chars, imperative mood, no trailing period unless the repo does.
- Body explains **why**, not what — the diff already says what. Wrap at 72.
- Reference issues the way the repo does (`Closes #123`, `PROJ-45`).
- Note breaking changes explicitly (`BREAKING CHANGE:` footer if conventional).
- No filler: "update code", "fix stuff", "changes" are not commit messages.

**Split into logical commits.** If the work contains a refactor plus a feature,
or a dependency bump plus its usage, commit them separately so each one is
revertable on its own. Stage with `git add -p` when a file contains both.

Never use `git commit -a` blindly, never `git add .` without having read
`git status` first, and never amend or force-push a commit that is already on
the remote unless the user explicitly asks.

## Step 4 — Push

Only if the user chose option 2 or 3.

- Confirm the branch is not the default branch. If work was done directly on
  `main`/`master`, stop and offer to move it to a branch first.
- `git push -u origin <branch>`.
- If the push is rejected as non-fast-forward, stop and report it. Do not
  force-push to resolve it; that is the user's call.

## Step 5 — Pull request

Only if the user chose option 3.

### If the branch already has a PR

Do not create anything. The push in Step 4 already added your commits to it.

- Re-read the existing description (`gh pr view --json body`) and update it to
  cover the new work — **edit it, do not overwrite it**. Someone may have
  written context by hand, and reviewers may have replied to it.
- Add a comment summarizing what changed since the last push, so reviewers who
  already looked do not have to re-read the whole diff:

  ```
  gh pr comment <number> --body "..."
  ```

  List the new commits, what they address (review feedback, a bug, scope
  added), and anything that invalidates an earlier review.
- If the PR is open (not draft) and the new commits make it incomplete or break
  tests, offer to move it back to draft with `gh pr ready --undo`.
- Report the PR URL and its current draft state.

### If there is no PR yet

Base the PR on the repo's default branch and use its template if
`.github/PULL_REQUEST_TEMPLATE.md` exists — fill it in rather than replacing it
with your own structure. Otherwise:

```markdown
## What
One or two sentences on the change, in plain language.

## Why
The problem, the ticket, or the user-facing reason. Link the issue.

## How
Notable implementation decisions and anything a reviewer would otherwise have
to reverse-engineer. Skip if the diff is self-evident.

## Risk & rollback
Blast radius if this is wrong, and how to undo it (revert commit, feature flag,
migration rollback).

## Deploy notes
New env vars, migrations to run, config changes, deploy ordering. Write "none"
if there are none — reviewers need to know you checked.

## Testing
What you ran and what passed. Screenshots for UI changes.
```

Then, per Question 1: append the agent footer for option 2, append nothing for
option 1.

**Always create the PR as a draft** — `gh pr create --draft`. The author decides
when work is ready for other people's time, and a draft costs nothing to
promote while an accidental review request wastes a colleague's afternoon.

After creating it, report the URL and tell the user how to promote it:

```
gh pr ready <number>
```

Mark it ready yourself only if the user explicitly asks. If they do, confirm
first that tests pass and nothing is left unfinished — say so plainly if not,
and let them decide.

## Step 6 — Report

- The commit SHAs and subjects created.
- Confirmation that authorship matches what was chosen — quote the actual
  trailer block (or state that there is none).
- Push result and PR URL, if applicable.
- Anything you deliberately left out of the commit, and why.
- Undo commands: `git reset --soft HEAD~1` for the last commit, or the PR URL
  to close.
