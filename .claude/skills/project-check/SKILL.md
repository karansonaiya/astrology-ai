---
name: project-check
description: Verifies a change to the Prerna AI codebase is production-ready before calling it done — typecheck, lint, i18n completeness, env sync, and a live check on any external integration touched. Use before telling the user a feature/fix is finished, especially after touching AI providers, the astrology provider, payments, Prisma schema, or user-facing text.
---

# Project check — Prerna AI production-readiness pass

Run this before declaring any change finished. Report each step's result;
don't silently skip a failing one.

## 1. Typecheck

```
npx tsc --noEmit -p tsconfig.json
```

Must exit 0. If it fails on `.next/dev/types/*` with no relation to your
change, an abruptly-killed dev server likely left a stale file — delete
`.next/` and rerun.

## 2. Lint the changed files

```
git status --porcelain
```

then `npx eslint <each changed .ts/.tsx path>` (quote any path with a
`(group)` segment, e.g. `"src/app/(app)/chat/page.tsx"` — PowerShell parses
unquoted parens as an operator). Must be clean.

## 3. i18n completeness (only if any user-facing string changed)

Every key added to `src/lib/i18n/messages/en.json` must also exist in
`hi.json` and `gu.json`. Grep the new key names across all three files —
if a key is missing from one, the change is incomplete, not "finish later."

## 4. `.env` / `.env.example` sync (only if an env var was added)

Every var added to `.env` must also appear in `.env.example` with a
placeholder value (never the real one). Diff the two files' variable names.

## 5. Prisma (only if `schema.prisma` changed)

- A migration exists under `prisma/migrations/` for the change (`npx prisma
  migrate dev --name <desc>` was run, not just a schema edit).
- `npx prisma generate` succeeded (no `EPERM` DLL-lock error — if it
  failed, a running dev server needs to be stopped first, then rerun).

## 6. Live-verify any external integration touched

If the change touches an AI provider, the astrology provider (Prokerala),
or payments: don't trust that it typechecks — hit the real endpoint at
least once. Write a throwaway script at `scripts/_*.mjs` using the real
client/fetch call, run it with `node scripts/_name.mjs` (or `npx tsx
--env-file=.env scripts/_name.mjs` for a `.ts` import), read the actual
response, then delete the script. Third-party response shapes are
frequently not what the docs imply — verify field names, units, and
language of returned values against the live response, not assumptions.

## 7. Dev server cleanup

If a dev server was started during this check (rather than reusing one
already running), stop it again before finishing — see
`CLAUDE.md`'s "Dev server discipline" section.

## Report

Summarize pass/fail per step. A step that doesn't apply to this change
(e.g. no schema change → skip step 5) should be noted as skipped, not
silently omitted from the report.
