# Phase 6: CI (GitHub Actions)

Part of the technet portfolio roadmap (tracked in Claude project memory as `project_portfolio_roadmap`). Executed out of the original phase order per explicit user request — Phase 2 (security) was skipped entirely, Phases 3-5 (admin dashboard, pagination, testing) remain not-started. Spans both repos: `technet-server` and `technet-react-redux`.

## Problem

Neither repo runs its test suite automatically. Both gained their first automated tests in Phase 1 (one Jest/Supertest test on the server, one Vitest component test on the client) but nothing enforces they keep passing on push or PR — a regression could land silently.

## Scope

One GitHub Actions workflow per repo, triggered on push and pull_request to `main`.

**`technet-server/.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

No lint step — the server repo has no ESLint config at all today, and adding one from scratch was explicitly declined during brainstorming (out of scope for "wire up CI for what exists"). No secrets required: `tests/review.test.js` uses `mongodb-memory-server`, never touching the real Atlas cluster.

**`technet-react-redux/.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx eslint src --ext ts,tsx
      - run: npm test
```

**Deviation from initial design, discovered during implementation:** the client's `npm run lint` script fails against the real codebase (3 pre-existing errors, plus 7 pre-existing warnings that also fail it via `--max-warnings 0`). The 3 errors were fixed (mechanical: two shadcn `no-empty-interface` patterns in `input.tsx`/`textarea.tsx`, one `no-empty-function` in `StarRatingInput.test.tsx`). The 7 pre-existing warnings were left alone (out of scope for "add CI") — CI's lint step runs `npx eslint src --ext ts,tsx` directly instead of `npm run lint`, so it still fails on real errors but tolerates the warning backlog. The local `npm run lint` script is unchanged and stays strict (`--max-warnings 0`) for developers.

No `build` step — matches the roadmap's original "lint+test" wording; adding a production-build check is a different (larger) guarantee than what this phase committed to, and isn't added here without a separate decision. No secrets required: `StarRatingInput.test.tsx` is a pure component test with no network/Firebase calls, and neither lint invocation needs env vars.

## Node version

Node 20 (current LTS). Neither repo declares an `engines` field, so this is a free choice — 20 is a safe, widely-supported baseline for the dependencies in play (Jest, Supertest, mongodb-memory-server, Vitest 0.34, Vite 4).

## Verification

GitHub Actions workflows can't be meaningfully unit-tested locally. Verification is: push the branch, open the PR, and watch the real Actions run via `gh pr checks` — the actual CI execution against the actual PR is the test. If it fails, fix and push again to the same branch (re-triggers the workflow) rather than treating a red run as unrelated noise.

## Out of scope

Lint for the server repo (no tooling exists; adding it was explicitly declined), a build-verification step for the client, deployment/CD, matrix testing across multiple Node versions, code coverage reporting. All of Phase 2 (security), Phase 3 (admin dashboard), Phase 4 (pagination), Phase 5 (broader testing) remain separate, un-started work.
