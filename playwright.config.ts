import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL switches between local dev (default) and the live Netlify
// site — same real database either way (see CLAUDE.md: .env holds live
// Supabase credentials), so global-setup/teardown seed and clean up a
// clearly-tagged test user regardless of which base URL a run targets.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
