# Prerna AI

**Private AI-powered astrology insights in your language.**

A mobile-first, installable PWA delivering AI-generated, astrology-style guidance in **Gujarati, Hindi, and
English** — for career, relationships, marriage, business, and daily reflection. Built as a complete, runnable
full-stack MVP: real auth, database, payments, admin panel, safety policy layer, and PWA files.

> Prerna AI never claims certain predictions. Every substantial AI answer is labelled as AI-generated guidance and
> ends with a disclosure sentence in the user's language. See `src/lib/ai/policy.ts` for the full safety policy.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| UI | Hand-built accessible component kit on Radix UI primitives + Framer Motion + Lucide icons |
| i18n | Custom lightweight provider (`src/lib/i18n`) — `en` / `hi` / `gu`, cookie + profile persisted |
| Forms/validation | React Hook Form–ready inputs + Zod schemas (`src/lib/validations`) |
| Data fetching | TanStack Query |
| Auth | Auth.js (NextAuth v5) — phone/email OTP + email/password fallback, optional Google OAuth |
| Database | PostgreSQL + Prisma ORM (`prisma/schema.prisma`) |
| AI | Provider abstraction for Anthropic Claude / OpenAI / local mock (`src/lib/ai`) |
| Astrology engine | Adapter interface with mock implementation + documented integration point (`src/lib/astrology`) |
| Payments | Razorpay abstraction + built-in mock/test provider (`src/lib/payments`) |
| PWA | Hand-written service worker, manifest, generated icons (`public/`, `scripts/generate-icons.mjs`) |

This app is **usable today** with zero external services configured (everything defaults to `mock` providers) and
becomes production-ready as you swap in real credentials — no code changes required, only environment variables.

---

## 2. Quick start (local development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# At minimum, set DATABASE_URL to a real Postgres instance (see below).
# Everything else can stay on its "mock" default for local development.

# 3. Create the database schema
npm run db:migrate

# 4. Seed demo data (report templates, plans, published horoscopes, demo users)
npm run db:seed

# 5. Run the app
npm run dev
```

Open http://localhost:3000.

**Demo accounts created by the seed script** — sign in via the email tab on `/login` with the address below; in
dev (`OTP_PROVIDER=mock`, the default) the 6-digit code is shown directly in the UI instead of being sent, so no
SMS/email provider is needed to test the full flow (the app is OTP/Google-only — there's no password login):
- Admin: `admin@prernaai.com`
- User: `demo@prernaai.com`

### Getting a local Postgres instance

Any of these work — just put the connection string in `DATABASE_URL`:
- **Supabase** (recommended, also gives you hosted Postgres + optional Storage): create a project, copy the
  connection string from Project Settings → Database → Connection string (use the "Transaction" pooler URI for
  serverless deployments, direct URI for local migrations).
- **Neon / Railway / Render Postgres**: any managed Postgres works — Prisma only needs a standard `postgresql://` URL.
- **Local Postgres via a native installer** (no Docker required): install PostgreSQL, then
  `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/prerna_ai?schema=public"`.

---

## 3. Environment variables

See `.env.example` for the full, commented list. Every external integration has a `mock`/`none` default so the app
runs without any of these being set except `DATABASE_URL` and `AUTH_SECRET`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (required) |
| `AUTH_SECRET` | Session signing secret — generate with `npx auth secret` (required) |
| `AI_PROVIDER` | `mock` \| `anthropic` \| `openai` — selects the AI adapter |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | API key for the selected AI provider |
| `ASTROLOGY_PROVIDER` | `mock` \| a real ephemeris/astrology API you've integrated |
| `PAYMENT_PROVIDER` | `mock` \| `razorpay` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Razorpay credentials |
| `OTP_PROVIDER` | `mock` \| `twilio` \| `msg91` |
| `EMAIL_PROVIDER` | `mock` \| `resend` \| `smtp` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Optional distributed rate limiting (falls back to in-memory) |

---

## 4. Database

Schema: `prisma/schema.prisma` — ~30 models covering users/auth, birth profiles, chat/messages/safety flags, AI
usage logs, horoscope content, credits/wallets, report store, orders/payments/refunds, subscriptions, referrals,
support tickets, feature flags, and audit logs.

```bash
npm run db:migrate   # create/update schema (dev)
npm run db:deploy    # apply migrations in production (CI/CD)
npm run db:seed      # demo/seed data — safe to re-run
npm run db:studio    # visual DB browser
```

---

## 5. AI provider & safety architecture

`src/lib/ai/index.ts` is the single entrypoint every feature calls (`generateAstrologyReply`). It:
1. Runs a pre-generation safety classifier (`src/lib/ai/safety.ts`) for medical/legal/financial/self-harm/abuse
   topics and **redirects to a safe, supportive, non-astrology response** for high-risk categories instead of
   calling the LLM.
2. Applies the server-side policy system prompt (`src/lib/ai/policy.ts`) — identity, tone, and a long list of hard
   rules (no guarantees, no fear tactics, no medical/legal/financial advice, no divorce/quit-job/loan advice, etc).
3. Calls the configured provider (`src/lib/ai/provider.ts` — Anthropic / OpenAI / mock), logs token usage and an
   estimated cost to `AiUsageLog` for the admin AI-usage dashboard.
4. Ensures every response ends with the correct-language disclosure sentence, and flags risky output for admin
   review (`SafetyFlag`).

Switch providers with `AI_PROVIDER=anthropic|openai|mock` — no other code changes needed.

## 6. Astrology calculation

`src/lib/astrology/adapter.ts` defines the provider interface. The bundled `mock` implementation produces
**clearly-labeled demo data** (`isDemoData: true`) deterministically derived from the birth date — it is never
presented as a real calculation. To connect a real ephemeris/astrology API (ProKerala, AstrologyAPI,
FreeAstrologyAPI, or a self-hosted Swiss Ephemeris service), implement `RealAstrologyProvider.calculateKundli` and
set `ASTROLOGY_PROVIDER` accordingly. Until you do, the Kundli page shows an explicit "astrology engine not
configured" state rather than fabricating planetary positions.

## 7. Payments

`src/lib/payments/provider.ts` abstracts Razorpay behind a `PaymentProvider` interface with a `mock` provider for
local development (`PAYMENT_PROVIDER=mock`, the default) — full checkout flow works with zero credentials, no
network calls, and no real charges. Order creation always re-prices server-side from the DB (`ReportTemplate` /
`Plan`) or the credit-pack catalog (`src/lib/pricing/catalog.ts`) — client-sent amounts are never trusted.

Webhook endpoint: `POST /api/payments/webhook` — verifies the Razorpay signature independently of the client and
is idempotent via a unique `(provider, eventId)` constraint on `PaymentEvent`, so Razorpay's at-least-once webhook
delivery can safely retry.

## 8. PWA

- `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html`
- Icons generated from an original inline SVG mark (no external image assets) — regenerate anytime:
  ```bash
  npm run generate:icons
  ```
- The service worker **never** caches `/api/*`, `/auth*`, `/chat`, `/payments`, `/reports`, `/admin`, `/settings`,
  `/profile`, `/onboarding`, or `/credits` — only static assets and the offline fallback page.
- "Install App" button appears in the marketing header, chat header, and Settings once the browser fires
  `beforeinstallprompt` (Chromium/Android). iOS Safari uses the native "Add to Home Screen" share-sheet flow.

## 9. Security

- Server-side Zod validation on every mutating API route.
- Object-level authorization: every resource lookup is scoped to the authenticated user (or role-gated for admin
  routes) — no client-supplied IDs are trusted without an ownership check.
- Rate limiting (`src/lib/rate-limit.ts`) on OTP requests and chat messages — Upstash Redis if configured, in-memory
  fallback otherwise.
- Security headers + CSP applied in `src/middleware.ts`.
- Passwords hashed with bcrypt; OTP codes hashed, single-use, expiring, attempt-limited.
- Admin actions write to `AuditLog`. Sensitive prompt content is never written to logs (`redactForLogs`).
- Role-based access control: `user`, `admin`, `support_agent`, `content_editor`.

## 10. Deploying

**Vercel + Supabase (recommended path):**
1. Create a Supabase project → copy the Postgres connection string into `DATABASE_URL`.
2. Push this repo to GitHub and import it in Vercel.
3. Add all required env vars from `.env.example` in the Vercel project settings (at minimum `DATABASE_URL`,
   `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`).
4. Run `npm run db:deploy` against the production `DATABASE_URL` (e.g. via a one-off Vercel/GitHub Action step),
   then `npm run db:seed` if you want the demo pricing/horoscope content.
5. Deploy. Set `PAYMENT_PROVIDER=razorpay` and `AI_PROVIDER=anthropic|openai` with real keys when you're ready to
   go live — the app runs safely on mocks until then.

Any other Node.js host works the same way — Next.js standalone output is compatible with most platforms.

## 11. Project structure

```
prisma/schema.prisma       Database schema
prisma/seed.ts             Demo/seed data
src/app/(marketing)        Public pages (landing, pricing, legal, horoscope, etc.)
src/app/(auth)/login       Login/signup
src/app/(onboarding)       10-step onboarding wizard
src/app/(app)              Authenticated app (dashboard, chat, kundli, reports, settings, …)
src/app/(admin)/admin      Admin panel (12 sections, RBAC-gated)
src/app/api                All API route handlers
src/lib/ai                 AI provider abstraction + safety policy
src/lib/astrology          Astrology calculation adapter
src/lib/payments           Payment provider abstraction + checkout hook
src/lib/i18n                i18n provider + en/hi/gu message catalogs
src/components/ui          Hand-built accessible UI kit
```

## 12. What's intentionally out of scope for this MVP

- Real ephemeris/astrology calculation (ships a clearly-labeled mock; see §6).
- PDF file generation for reports (the report content, disclosure, and "download PDF" affordance are wired up;
  wire a PDF renderer of your choice — e.g. `@react-pdf/renderer` or a headless-Chrome service — behind
  `reports.downloadPdf`).
- WhatsApp/SMS re-engagement notifications (architecture only, per the safety requirement not to implement
  unauthorised messaging).
- SMTP email provider implementation (Resend and mock are implemented; SMTP throws a clear "not wired up" error —
  install `nodemailer` and fill in `SmtpEmailProvider` if you need it).
