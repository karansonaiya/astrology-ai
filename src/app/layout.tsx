import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Gujarati, Noto_Sans_Devanagari } from "next/font/google";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { isAppLocale, resolveLocaleFromBrowser, localeCookieName, type AppLocale } from "@/lib/i18n/config";
import { THEME_COOKIE, type Theme } from "@/lib/theme/shared";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPromptListener } from "@/components/pwa/install-prompt-listener";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoGu = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  variable: "--font-noto-gu",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const notoDev = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-dev",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Prerna AI — Private AI-powered astrology insights",
  description: "Private, AI-powered astrology-style guidance in Gujarati, Hindi, and English. AI-generated guidance for reflection, not certainty.",
  manifest: "/manifest.webmanifest",
  applicationName: "Prerna AI",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Prerna AI" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1b140f" },
    { media: "(prefers-color-scheme: light)", color: "#fbf6ef" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerList = await headers();

  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale: AppLocale = isAppLocale(cookieLocale)
    ? cookieLocale
    : resolveLocaleFromBrowser(headerList.get("accept-language"));

  const cookieTheme = cookieStore.get(THEME_COOKIE)?.value;
  const theme: Theme = cookieTheme === "light" ? "light" : "dark";

  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang={locale} className={theme === "light" ? "light" : undefined} suppressHydrationWarning>
      <body className={`${inter.variable} ${notoGu.variable} ${notoDev.variable} cosmic-bg antialiased`}>
        {/* Google AdSense's account-verification snippet. `beforeInteractive`
            is what makes Next guarantee this lands in the real <head> (see
            Next's next/script docs) — AdSense's own verification step
            checks for exactly that, on any page it crawls. This alone never
            shows an ad anywhere; only <AdSlot /> (blog/faq/panchang/
            horoscope) does that, gated on ad config + subscriber status. */}
        {adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <Providers initialLocale={locale} initialTheme={theme}>
          {children}
        </Providers>
        <ServiceWorkerRegister />
        <InstallPromptListener />
      </body>
    </html>
  );
}
