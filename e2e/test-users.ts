// Shared by global-setup/global-teardown/auth.spec — a ".test" TLD email
// (IANA-reserved, never a real deliverable address) so a seeded/created test
// account can never be confused with or accidentally reach a real person.
export const E2E_LOGIN_EMAIL = "playwright.e2e.login@prerna-internal.test";
export const E2E_PASSWORD = "E2eTest!12345";

// The signup test creates a brand-new account each run under this prefix —
// global-teardown sweeps up every email starting with it.
export const E2E_SIGNUP_EMAIL_PREFIX = "playwright.e2e.signup+";
export function freshSignupEmail(): string {
  return `${E2E_SIGNUP_EMAIL_PREFIX}${Date.now()}-${Math.floor(Math.random() * 1e6)}@prerna-internal.test`;
}
