---
name: mergemain
description: Safely bring the latest main into the current branch. Fetches main fresh from the remote, merges it into the working branch, and resolves conflicts by reading the full context of both sides — keeping the branch's logic changes and main's unrelated UI/infra changes rather than blindly taking one side. Asks the user whenever intent is genuinely ambiguous. Use when asked to merge or sync with main, update a branch, or when the user runs /mergemain.
---

# mergemain

Merge the latest `main` into the current branch and resolve the conflicts
correctly. The whole point is the conflict resolution: **never** resolve by
picking a side because it is easier.

## Step 1 — Pre-flight

```
git rev-parse --abbrev-ref HEAD          # current branch
git status --porcelain                   # must be clean
git remote -v
git rev-parse --abbrev-ref origin/HEAD   # real default branch (main/master/develop)
```

- If HEAD is already the default branch, stop and tell the user — there is
  nothing to merge.
- If the working tree is dirty, stop and ask: commit, stash, or abort. Do not
  stash silently; someone's uncommitted work is not yours to move.
- Note the current HEAD sha so you can offer an exact rollback later.

## Step 2 — Get main fresh

```
git fetch origin --prune
```

Merge from `origin/<default>` directly — do not check out main, and do not rely
on a stale local copy. Report how far behind the branch was
(`git rev-list --count HEAD..origin/main`) and how many files main touched.

## Step 3 — Merge

```
git merge origin/main --no-edit
```

If it merges cleanly, jump to Step 6.

## Step 4 — Understand before resolving

List the conflicts (`git diff --name-only --diff-filter=U`) and, for each file,
build real context before touching it:

- `git log --oneline HEAD..origin/main -- <file>` — why main changed it.
- `git log --oneline origin/main..HEAD -- <file>` — why this branch changed it.
- Read the **whole file**, not just the `<<<<<<<` hunks, plus the callers of
  anything whose signature moved.

Classify each conflicted hunk:
- **Disjoint** — the two sides changed different concerns that happen to sit on
  adjacent lines. Keep **both**, ordered so the file still reads correctly.
- **Same concern, main is newer** — main refactored/renamed/moved what the
  branch also edited. Take main's structure and **re-apply the branch's intent
  on top of it** (rename the branch's call sites, move its logic into main's new
  file, adapt to the new signature). Never discard the branch's behavior just
  because main rewrote the surroundings.
- **Same concern, genuinely competing** — both sides implement the same thing
  differently. This is the only case that needs a decision, and it is the case
  you escalate if it is not obvious.

Default heuristics (they are heuristics, not rules — the context above wins):

- The branch's **feature logic** is the reason the branch exists: preserve it.
- Main's **UI/styling/copy/formatting-only** changes on files where the branch
  only changed logic: take main's presentation, keep the branch's logic.
- Main's **infra changes** — dependency bumps, config, migrations, CI, codegen,
  shared utilities, cross-cutting renames: take main's version and adapt the
  branch to it. Main is the trunk everyone else builds on.
- **Lockfiles** (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`,
  `poetry.lock`): never hand-merge. Take main's, then re-run the install command
  so the branch's own dependency additions are reinstated.
- **Migrations**: never renumber or drop main's migration. Keep both and, if
  ordering matters, re-date the branch's migration to come after main's.
- **Generated files** (build output, codegen, snapshots): regenerate rather than
  merge by hand.
- Deleted on one side, modified on the other: do not guess. Find out why it was
  deleted — usually the content moved somewhere else, so port the change to the
  new home.

Resolve by editing the file to the correct final state, removing every conflict
marker. `git checkout --ours/--theirs` is only acceptable for lockfiles and
generated files.

## Step 5 — Ask when it is genuinely ambiguous

Stop and ask the user when:
- Both sides implement the same behavior differently and neither is clearly a
  superset.
- Resolving requires product intent you cannot read off the code (which
  validation rule wins, which copy is correct, which default is intended).
- Main deleted or fundamentally reshaped something the branch depends on.
- A schema/migration conflict could cause data loss.

Ask with the actual code in front of them: file, both versions, what each does,
what you recommend and why. Ask all such questions in one batch rather than
interrupting repeatedly. Do the unambiguous files first so only the real
questions remain.

## Step 6 — Verify the merge, not just the syntax

After every file is resolved, before finishing:

1. `git diff --check` and grep for leftover `<<<<<<<`, `=======`, `>>>>>>>`.
2. Run the project's install (if lockfiles moved), typecheck, lint, and test
   commands. Paste the real output.
3. Re-read the diff of the merge result against **both** parents for any file
   you resolved by hand — confirm main's change survived and the branch's change
   survived.
4. Semantic check: renamed symbol updated everywhere, new required config
   documented, no duplicate imports or duplicated function bodies from a
   both-sides keep.

Only commit the merge when this passes. If tests were already failing on main
before the merge, say so explicitly rather than attributing it to the merge.

## Step 7 — Report

- Files that conflicted and how each was resolved, in one line apiece.
- Anything you took from main that changes how the branch must be run
  (new env var, migration to run, dependency added).
- Verification results, verbatim.
- The rollback command: `git reset --hard <pre-merge-sha>` (or
  `git merge --abort` if you stopped mid-merge).

Do not push. Pushing is the user's call unless they explicitly asked for it.
