# Security & sensitive-data handling

This document summarizes how Prerna AI treats sensitive data in code, matching what's implemented (not aspirational).

## What's sensitive

- **Birth data** (date, time, place) — `BirthProfile`
- **Chat content** — `Message.content`, `CompatibilityRequest.personAData/personBData`
- **Auth material** — `User.passwordHash`, `OtpCode.codeHash`, session tokens
- **Payment data** — `Order`, `PaymentEvent.rawPayload`

## Rules enforced in code

1. **Object-level authorization.** Every API route that reads/writes a user-owned resource filters by
   `userId: session.user.id` (or role for admin routes) — see `src/lib/auth/guard.ts` (`requireUser`,
   `requireAdmin`) and its usage across `src/app/api/**`. No route trusts a client-supplied ID without an
   ownership check.
2. **No plaintext secrets at rest.** Passwords: bcrypt (`src/lib/auth/password.ts`). OTP codes: bcrypt, single-use,
   expiring, attempt-limited (`src/lib/auth/otp.ts`).
3. **No sensitive data in logs.** `src/lib/utils.ts#redactForLogs` redacts emails/long numbers before any
   debug-level logging; chat message bodies are never `console.log`'d in API routes.
4. **Payment webhook integrity.** `POST /api/payments/webhook` independently verifies the Razorpay signature
   (`src/lib/payments/provider.ts#verifyWebhookSignature`) — client-reported payment success is never trusted
   alone (`src/app/api/payments/verify/route.ts` also re-verifies server-side).
5. **Idempotency.** `Order.idempotencyKey` is unique; `PaymentEvent` has a unique `(provider, eventId)` constraint
   so webhook retries can't double-fulfil an order.
6. **Deletable-by-default sensitive data.** `DELETE /api/birth-profile`, `POST /api/account/delete`,
   `POST /api/account/export` — see Settings page. Deletion soft-deletes (`deletedAt`) where audit history matters
   (orders, chats) and hard-clears PII fields on account deletion.
7. **Rate limiting.** OTP requests and AI chat messages are rate-limited per IP/user (`src/lib/rate-limit.ts`).
8. **Service worker never caches sensitive routes.** See `public/sw.js` — `/api/*`, `/auth*`, `/chat`, `/payments`,
   `/reports`, `/admin`, `/settings`, `/profile`, `/onboarding`, `/credits` are excluded from all caching.
9. **CSP + security headers** applied in `src/middleware.ts` on every response.
10. **Audit logging.** Admin actions that change user/refund/payment state write to `AuditLog`.

## Known gaps to close before a real production launch

- Field-level encryption at rest for `BirthProfile` (currently protected by DB access controls + TLS in transit,
  not application-layer encryption).
- A real content-moderation/classifier model behind `src/lib/ai/safety.ts` — the shipped classifier is a
  fast keyword-based pre-filter, not a substitute for a proper moderation model in front of a production LLM.
- CAPTCHA on OTP request / signup (abstraction point exists via `CAPTCHA_PROVIDER`, not yet wired to a provider).
- Automated PII scrubbing / retention-window jobs for old `OtpCode`, `AiUsageLog`, `PaymentEvent` rows.
