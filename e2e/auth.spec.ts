import { test, expect } from "@playwright/test";
import { E2E_LOGIN_EMAIL, E2E_PASSWORD, freshSignupEmail } from "./test-users";

async function checkConsent(page: import("@playwright/test").Page) {
  await page.getByRole("checkbox", { name: /I agree/i }).check();
  await page.getByRole("checkbox", { name: /confirm I am/i }).check();
}

test.describe("auth: signup, login, logout", () => {
  test("sign up creates a real account and logs in automatically", async ({ page }) => {
    const email = freshSignupEmail();
    await page.goto("/login");

    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create your Prerna AI account" })).toBeVisible();

    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
    await page.getByLabel("Confirm password").fill(E2E_PASSWORD);
    await checkConsent(page);

    await page.getByRole("button", { name: "Create account" }).click();

    // A brand-new account has no onboarding done yet — (app)/layout.tsx
    // redirects there, which is itself proof the session was really created
    // (an unauthenticated request would land on /login instead).
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("login, then logout actually clears the session", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in to Prerna AI" })).toBeVisible();

    await page.getByLabel("Email address").fill(E2E_LOGIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
    await checkConsent(page);

    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout via the header's icon button + its confirm dialog (the real
    // logged-in UI path, not a direct API call).
    await page.getByRole("button", { name: "Log out" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Log out" }).click();
    await page.waitForURL("/", { timeout: 15_000 });

    // The real proof logout worked server-side, not just a UI navigation:
    // a protected page must bounce back to /login with no session left.
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });

  test("wrong password is rejected with a clear error, no session created", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(E2E_LOGIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-password");
    await checkConsent(page);

    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Google sign-in is wired up and starts the real OAuth redirect", async ({ page }) => {
    await page.goto("/login");
    await checkConsent(page);

    const googleButton = page.getByRole("button", { name: "Continue with Google" });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();

    // Not completing a real Google login (no real Google test account here)
    // — just confirming the click actually redirects to Google's own domain,
    // which proves the provider is registered and reachable, not silently
    // broken (e.g. missing/mismatched client credentials on this environment).
    await Promise.all([page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 }), googleButton.click()]);
  });

  // Uses its own fresh throwaway account (via signup) rather than
  // E2E_LOGIN_EMAIL — a shared email would hit issueOtp's real 45s
  // per-destination cooldown (lib/auth/otp.ts) on a quick repeat run,
  // which is correct anti-abuse behavior, not something to work around by
  // weakening it.
  test("forgot password resets the account and logs in with the new password", async ({ page }) => {
    const email = freshSignupEmail();
    const originalPassword = "OriginalPass!123";
    const newPassword = "NewE2ePass!999";

    await page.goto("/login");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(originalPassword);
    await page.getByLabel("Confirm password").fill(originalPassword);
    await checkConsent(page);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 });

    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send reset code" }).click();

    // Dev-mode convenience (see password-reset/request/route.ts): the real
    // code is shown inline instead of requiring a real inbox.
    const devCode = page.locator("strong");
    await expect(devCode).toBeVisible({ timeout: 10_000 });
    const code = (await devCode.textContent())?.trim() ?? "";
    expect(code).toMatch(/^\d{6}$/);

    await page.getByLabel("Enter the 6-digit code").fill(code);
    await page.getByLabel("New password").fill(newPassword);
    await page.getByLabel("Confirm password").fill(newPassword);

    // Auto-submits once all three fields are valid (see the page's own
    // effect) — no explicit button click needed. Still-unonboarded account
    // -> (app)/layout.tsx bounces /dashboard to /onboarding.
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 });

    // Real proof the new password actually took effect: clear the session
    // (no logout UI on the onboarding page) and log back in with ONLY the
    // new password.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await checkConsent(page);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 });
  });
});
