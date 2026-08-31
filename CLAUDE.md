@AGENTS.md

# Jyoti AI — project rules

Astrology SaaS: Next.js (latest, breaking changes vs. training data — read
`node_modules/next/dist/docs/` before writing Next-specific code), Prisma +
Postgres (Supabase), NextAuth v5, Tailwind v4, next-intl (en/hi/gu). Every
rule below exists because it was the actual fix for a real bug or a real
gap found in this codebase — follow them, don't rediscover them the hard way.

## Before calling anything "done"

1. `npx tsc --noEmit -p tsconfig.json` — must exit 0.
2. `npx eslint <changed files>` (quote paths containing `(group)` segments in
   PowerShell) — must be clean.
3. If you touched `prisma/schema.prisma`: `npx prisma migrate dev --name <desc>`.
   On Windows, a running `next dev` locks the query-engine DLL — `prisma
   generate`/`migrate dev` fails with `EPERM ... query_engine-windows.dll.node`
   until that dev server is stopped. Ask the user to stop theirs, or stop one
   you started yourself.
4. Never mark a task done on "it typechecks" alone if it touches a live
   integration (AI provider, astrology provider, payments) — hit the real
   endpoint at least once (a throwaway script in `scripts/_*.mjs`, deleted
   after) before telling the user it works. Response shapes from third-party
   APIs (field names, units, language of returned labels) are frequently not
   what the docs imply — this project has already hit two of these
   (Prokerala's rasi names come back in Sanskrit not English despite
   `la=en`; its `position` field is a rasi number, not a house number).

## Dev server discipline

- The user runs their own `npm run dev` in their own terminal. If you start
  one yourself to test something, **stop it again (TaskStop) once done** —
  don't leave it holding port 3000 or the Prisma DLL lock.
- Before starting one, check whether a server is already running; if so,
  use that instead of starting a second one.
- Clear `.next/` if an abruptly-killed dev server leaves stale/corrupt
  `.next/dev/types/*` files causing unrelated-looking `tsc` errors.

## Secrets & environment

- `.env` here holds **live** credentials (real Supabase Postgres, real
  Gemini/Prokerala keys) — treat it as production-adjacent, not toy dev
  values. Never echo secret values back in chat; if the user pastes one in a
  message, tell them to rotate it (chat history isn't a safe place for a
  live key).
- Every env var lives in **both** `.env` and `.env.example` (placeholder
  value in the latter) — keep them in sync when adding one.
- `.env*` is gitignored — never remove that from `.gitignore`.

## The provider-abstraction pattern — follow it for any new integration

`getAiProvider()` (`src/lib/ai/provider.ts`), `getAstrologyProvider()`
(`src/lib/astrology/adapter.ts`), and `getPaymentProvider()`
(`src/lib/payments/provider.ts`) all follow the same shape: an env var
(`AI_PROVIDER`, `ASTROLOGY_PROVIDER`, `PAYMENT_PROVIDER`) selects between a
`mock` implementation (default, zero-config, clearly labeled as demo data)
and one or more real ones. This is why the app runs end-to-end with no API
keys configured. Any new external integration (SMS, email, a new AI/astro
provider) should follow the same pattern rather than being wired in as a
one-off — check `.env.example`'s comments for the existing convention before
adding a new var.

## AI content — hard rules

- Any new user-facing AI generation should go through
  `generateAstrologyReply()` (`src/lib/ai/index.ts`) — it applies the safety
  classifier, the policy system prompt (no certainty claims, no medical/
  legal/financial advice, self-harm/abuse redirects, etc. — see
  `src/lib/ai/policy.ts`), and logs `AiUsageLog`. If a feature deliberately
  skips part of this (e.g. horoscope draft generation skips the chat
  disclosure sentence because the public page already shows a static one),
  say so in a comment — don't skip silently.
- **AI-generated content shown publicly (horoscopes, etc.) is never
  auto-published.** It's created as `status: "draft"`; a human admin must
  explicitly hit Publish (`PATCH .../horoscope/[id]`). Don't build a path
  that bypasses this, even for convenience.
- Never invent real astrological calculation data (planetary positions,
  house placements). Only the configured real astrology provider supplies
  that; the mock provider returns clearly-flagged demo data
  (`isDemoData: true`).

## i18n — non-negotiable

Every user-facing string change touches **all three** locale files together:
`src/lib/i18n/messages/{en,hi,gu}.json`. Adding a key to only `en.json` is an
incomplete change, not a "do the rest later" — the app is Gujarati/Hindi/
English by design, not English-first.

## Free-tier / abuse-protection consistency

Logged-in users get `FREE_QUESTIONS_CAP = 3` lifetime free AI questions
(`src/lib/pricing/catalog.ts`) before needing credits. Anonymous/public AI
endpoints (e.g. `/api/public/ask`) should mirror that same "3 free" shape
via IP-based rate limiting (`src/lib/rate-limit.ts`) rather than inventing a
different number — keep the "everyone gets a free taste" policy consistent
whether or not someone is signed in.

## Windows/PowerShell specifics for this repo

- Quote any path with a `(group)` route segment: `"src/app/(app)/chat/page.tsx"`.
- `Invoke-RestMethod` swallows error response bodies on non-2xx; use
  `Invoke-WebRequest` + `catch [System.Net.WebException]` +
  `GetResponseStream()` when you need to see the actual API error JSON.
- `prisma db execute` does not print `SELECT` output — for ad-hoc queries,
  write a throwaway `scripts/_*.mjs` using `@prisma/client` instead (delete
  it after use; it needs to run from the project root, not the OS temp dir,
  for `node_modules` resolution to work).
