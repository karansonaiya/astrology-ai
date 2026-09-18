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
});
