---
name: prodtest
description: Senior-QA test pass on a newly implemented feature. Detects the project's real test stack, writes unit and functional/integration tests, then drives the running app with Playwright for end-to-end coverage, saving screenshots to a gitignored folder for human review. Asks upfront whether found bugs should be fixed or only reported. Use when asked to test a new feature, add test coverage, or when the user runs /prodtest.
---

# prodtest

Test a feature the way a senior QA engineer would: find out what the feature
actually claims to do, then try to break it — at the unit, integration, and
browser level.

## Step 0 — Ask the fix policy first

Before writing anything, ask once:

> Should I fix bugs as I find them, or only report them?

Wait for the answer. It governs the whole run:
- **Fix mode** — when a test fails because the *product* is wrong, fix the
  product, re-run, and note the fix in the report.
- **Report-only mode** — leave the failing test in place (or document the
  repro), change no product code, and list every defect at the end.

In both modes, a test that fails because the *test* is wrong is always yours to
fix.

## Step 1 — Identify the feature under test

- Use the user's description if given.
- Otherwise diff the branch: `git diff $(git merge-base HEAD origin/main)...HEAD
  --stat` plus recent commit messages, and read the changed handlers,
  components, and models.
- Write down, in 3–6 bullets, what the feature is supposed to do — the
  behaviors you are about to verify. Show these to the user as your test basis;
  a wrong premise here wastes the whole run.

## Step 2 — Learn the real test stack (do not assume)

Read, don't guess:

- `package.json` / `pyproject.toml` / `composer.json` / `go.mod` — which runner
  exists (vitest, jest, pytest, phpunit, go test) and which scripts run it.
- An existing test file near the feature — copy its imports, factories,
  fixtures, mocking style, DB setup/teardown, and naming. Match the house style
  exactly.
- CI config — the command that must pass.
- How the app boots locally (dev script, env vars, docker compose, seed/migrate
  commands) and on which port.

If no test infrastructure exists at all, say so and propose the minimal setup
before installing anything.

## Step 3 — Unit tests

Cover the pure logic the feature introduced: calculations, validators,
reducers, permission predicates, formatters, state machines.

For each unit: the happy path, then the edges that actually bite — empty,
null/undefined, zero, negative, very large, unicode, duplicates, boundary
values, wrong types at trust boundaries, timezone/DST for dates, rounding for
money.

No test that only re-asserts a mock. If mocking the dependency makes the test
tautological, promote it to an integration test.

## Step 4 — Functional / integration tests

Exercise the feature through its real seams with real wiring — HTTP handler →
service → database, or component → store → API client.

Cover:
- Success path with a realistic payload.
- Validation failures and the exact status codes/messages contracted.
- **Authorization**: unauthenticated, wrong role, and another tenant's user
  hitting the same resource must all be rejected.
- Persistence: assert the database state after the call, not just the response.
- Idempotency/duplicates where the feature can be retried.
- Failure of a dependency (DB error, third-party timeout) — the system should
  degrade, not corrupt.

## Step 5 — End-to-end with Playwright

1. Check whether Playwright is already installed and configured. If it is not,
   ask before adding it and its browsers — it is a heavy dependency.
2. Start the app the way the project documents it, wait for readiness, and seed
   any data the flow needs.
3. Write specs for the real user journeys of this feature, including at least
   one unhappy path (validation error, permission denied, or network failure).
4. Prefer role/label/text selectors and web-first assertions
   (`expect(locator).toBeVisible()`); no arbitrary `waitForTimeout`.
5. Capture the browser console and failed network requests during each spec and
   surface them — a green test over a console full of 500s is not green.

### Screenshots for human review

Save artifacts to `.prodtest/` at the repo root:

```
.prodtest/
  screenshots/<spec-name>/01-<step>.png
  report.md
```

- Screenshot every meaningful state transition, not just failures, so the user
  can eyeball the feature without running anything.
- Configure Playwright with `screenshot: 'only-on-failure'` **plus** explicit
  `page.screenshot()` calls at each step; also enable `trace: 'retain-on-failure'`.
- Ensure `.gitignore` contains `.prodtest/` — add the line if missing and say
  that you did. Never commit these artifacts.
- Write `.prodtest/report.md` as an index: each spec, pass/fail, and relative
  links to its screenshots in order.

## Step 6 — Run everything and report honestly

Run the unit, integration, and E2E suites and paste the real summary output.

For each defect found:

```
### [Sev] Short title
Where: apps/web/src/checkout/apply-coupon.ts:73
Repro: 1. ... 2. ... 3. ...
Expected: ...  Actual: ...
Evidence: .prodtest/screenshots/checkout/04-coupon-error.png
Status: fixed in <file:line> | reported only
```

Then a summary: tests added (by layer), pass/fail counts, defects by severity,
screenshot folder path, and — explicitly — **what you did not test and why**
(flows you could not reach, external services you had to stub, browsers you
skipped).

Never report a suite as passing that you did not actually run to completion.
