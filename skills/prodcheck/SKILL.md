---
name: prodcheck
description: Senior-engineer production-readiness review of code changes. Verifies every finding against the real codebase before reporting it — no speculative or pattern-matched advice. Focuses on security, authz and tenant data isolation, N+1 and other database problems, correctness under concurrency, and failure modes. Use when asked to review code, check whether a change is safe to ship, or when the user runs /prodcheck.
---

# prodcheck

A staff-level review of code that is about to hit production. The value of this
skill is **not** the checklist — it is the refusal to report anything you have
not proven.

## Non-negotiables

1. **Fact first, opinion never.** Every finding cites `file:line` and quotes the
   real code. If a claim depends on how a framework/ORM/middleware behaves, open
   the config, the migration, the base class, or `node_modules`/site-packages
   and confirm it. "Prisma probably lazy-loads this" is not a finding.
2. **No finding without a trigger.** You must be able to write a concrete
   failure scenario: *these inputs / this state → this wrong outcome*. If you
   cannot, delete the finding. Silence beats noise.
3. **Do not write code in this skill unless the user says to.** Review is the
   deliverable. Fixing is a separate, explicitly authorized step (Step 6).
4. **No style commentary.** Naming, formatting, and taste are out of scope
   unless they cause a real defect. Linters exist.
5. **Report what you did not cover.** If you skipped generated files, vendored
   code, or a subsystem you could not read, say so.

## Step 1 — Scope the review

Determine exactly what is under review, in this order:

- An explicit argument (path, PR number, commit range) wins.
- Otherwise: `git status --porcelain` + `git diff` for uncommitted work, and
  `git diff $(git merge-base HEAD origin/main)...HEAD` for the branch.
- If both are empty, ask the user what to review. Do not review the whole repo
  uninvited.

State the scope in one line before you start (`Reviewing 14 files, +812/-90,
branch feat/billing vs origin/main`).

## Step 2 — Build ground truth before judging

Read enough of the surrounding system that you are reviewing behavior, not
diffs. At minimum, for the code in scope:

- The **schema**: migrations / `schema.prisma` / models — real columns, real
  indexes, real constraints, real nullability.
- The **auth path**: middleware, guards, decorators, route registration. Know
  what runs before the handler and what it actually enforces.
- The **callers**: who invokes the changed functions, with what values, from
  where (HTTP, cron, queue, webhook, admin script).
- The **existing conventions**: how the rest of this codebase already does
  authz, scoping, transactions, and error handling. A change that breaks the
  house pattern is a finding; a change that follows a pattern you personally
  dislike is not.

## Step 3 — Review passes

Run each pass deliberately. Skip a pass only if the diff cannot possibly touch
it, and say which passes you skipped.

### Security
- Authn and authz on **every** new or modified entry point — including
  webhooks, health/debug routes, admin actions, and queue consumers.
- IDOR: any resource fetched by an id from the request must be re-checked
  against the caller's permissions, not just found.
- Injection: raw SQL/string-built queries, `eval`, shell interpolation,
  unsanitized ORM `where` fragments, NoSQL operator injection.
- Mass assignment: request bodies spread into `create`/`update` without an
  allowlist.
- Secrets: keys, tokens, connection strings in code, tests, fixtures, or logs.
- Output safety: `dangerouslySetInnerHTML`, unescaped templating, reflected
  user input.
- SSRF and path traversal on any URL/file input; file upload type and size
  handling.
- PII in logs, error payloads, and third-party telemetry.
- Rate limiting on auth, password reset, and expensive endpoints.

### Data isolation (multi-tenancy)
- Every query against a tenant-scoped table filters by tenant/org/workspace id
  — on **reads, writes, updates, and deletes**.
- The scope comes from the session/token, never from the request body.
- Background jobs, exports, cron, and admin tooling carry the tenant scope too;
  these are where isolation usually breaks.
- Cache keys, rate-limit keys, and file/storage paths include the tenant id.
- Aggregates and `count()` calls are scoped (a leaked count is a leak).

### Database and queries
- **N+1**: loops or `map`/`Promise.all` that issue one query per item; lazy
  relations touched inside serializers, templates, or response mappers; missing
  `include`/`select_related`/`prefetch_related`/`joinedload`/`with()`. Trace the
  loop to the query call to prove it, then say how many queries it costs for a
  realistic N.
- **Indexes**: confirm in the migration files that columns used in `WHERE`,
  `JOIN`, `ORDER BY`, and uniqueness checks are indexed. Flag new foreign keys
  with no index.
- **Unbounded reads**: queries with no `LIMIT`/pagination, `SELECT *` of wide
  rows, loading a full table into memory.
- **Transactions**: multi-write operations that must be atomic but are not;
  external HTTP calls or long work held inside a transaction; missing rollback.
- **Concurrency**: check-then-act races (`findFirst` then `create`), lost
  updates without optimistic locking or `SELECT ... FOR UPDATE`, missing unique
  constraints backing an application-level uniqueness check.
- **Migrations**: destructive or table-locking DDL, non-nullable column added
  without a default or backfill, no rollback path, ordering assumptions between
  deploy and migrate.

### Correctness and failure modes
- Unawaited promises, unhandled rejections, swallowed exceptions
  (`catch {}`), errors logged and then continued as if success.
- Network calls with no timeout, no retry, or retry without backoff/jitter;
  non-idempotent retries.
- Money/quantity in floats; timezone and DST handling; off-by-one on ranges.
- Null/undefined paths the types claim are impossible but the data allows.
- Breaking API/contract changes for existing clients; enum/status values added
  without handling everywhere they are switched on.
- What happens on partial failure — is the system left in a valid state?

## Step 4 — Grill your own findings

Before writing the report, attack each candidate finding as a skeptic whose job
is to kill it:

- Re-open the file and confirm the code still says what you claim.
- Look for the guard you might have missed — a middleware, a base repository
  that auto-scopes, a DB constraint, a `@Transactional`, a global default.
- Ask whether the trigger is actually reachable from real callers.
- Default to **dropping** the finding when you are unsure.

Findings that survive are reported as **Confirmed**. A finding you strongly
suspect but could not fully verify may be reported as **Unverified** — clearly
labeled, with the exact check you could not complete and how to complete it.
Never blend the two.

## Step 5 — Report

Order by severity, worst first. Keep it dense.

```
### [Blocker] Tenant scope missing on invoice lookup
apps/api/src/invoices/invoices.service.ts:48

  const invoice = await db.invoice.findUnique({ where: { id } })

`id` comes straight from the route param and the query has no orgId filter.
The guard at invoices.controller.ts:22 only checks that a session exists.
Trigger: any authenticated user calls GET /invoices/<other-org-invoice-id>
and reads another tenant's invoice, including amounts and customer email.
Fix: scope the query to session.orgId (matches the pattern in
subscriptions.service.ts:31) and return 404 on miss.
```

Severity ladder:
- **Blocker** — data leak, auth bypass, data loss, or guaranteed production
  breakage. Do not ship.
- **High** — will hurt under real traffic or real data (N+1 on a hot path,
  missing index on a growing table, race that corrupts state).
- **Medium** — real defect, limited blast radius.
- **Nit** — worth knowing, not worth blocking. Cap this section at five items.

Close with a one-line verdict: **Ship / Ship after blockers / Do not ship**, and
the list of passes you skipped.

## Step 6 — Ask before fixing

If — and only if — at least one issue was found, ask once:

> Found N issues (X blockers). Want me to fix them, or is this review-only?

Options to offer: fix blockers + high only, fix everything, or report only.
Then stop and wait. **If the user does not ask for fixes, write no code at
all** — not even "while I'm here" cleanups.

## Step 7 — Fix protocol (only if authorized)

- Fix in severity order, smallest correct change per issue.
- Follow the codebase's existing pattern for that concern; do not introduce a
  new abstraction to fix one bug.
- One issue per commit-sized change, and re-state which finding it closes.
- Run the project's typecheck/lint/tests after the fixes and report the real
  output. If something fails, say so — do not claim green.
- Do not fix Unverified findings. Verify first, or leave them.
