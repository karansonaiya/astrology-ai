/**
 * Plain constants shared between the server (app/layout.tsx, reading the
 * cookie to pick the initial theme) and the client (theme/provider.tsx's
 * ThemeProvider, writing the cookie on toggle).
 *
 * Found live: THEME_COOKIE previously lived in provider.tsx, which starts
 * with "use client". Importing a plain constant from a "use client" module
 * into a Server Component doesn't survive Next's RSC bundling the way a
 * plain shared module does — `THEME_COOKIE` resolved to `undefined` at
 * runtime on the server (confirmed live: cookieStore.get(THEME_COOKIE) with
 * a real "prerna_theme=light" cookie present still came back empty), so the
 * root layout always fell back to the hardcoded "dark" default regardless
 * of the cookie — even though the client-side toggle correctly wrote the
 * cookie. That's exactly the "click light, refresh, back to dark" bug.
 * Fix: keep anything a Server Component needs to import in a plain module
 * with no "use client" directive.
 */
export type Theme = "dark" | "light";
export const THEME_COOKIE = "prerna_theme";
