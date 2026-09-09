"use client";

import Link from "next/link";
import { Mail, LifeBuoy } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 md:px-6">
      <h1 className="font-heading text-3xl font-semibold">{t("nav.contact")}</h1>
      <p className="mt-3 text-muted">
        We usually respond within 1–2 business days. For an emergency or safety concern, please contact local
        emergency services directly rather than waiting for a reply here.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Mail size={20} className="mb-2 text-primary" />
            <CardTitle className="text-base">Email support</CardTitle>
            <CardDescription>prernaai03@gmail.com</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <LifeBuoy size={20} className="mb-2 text-gold" />
            <CardTitle className="text-base">Support tickets</CardTitle>
            <CardDescription>Log in to open a tracked support ticket from Help & Safety.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Legal/merchant identity — required by our payment gateway's (Cashfree)
          verification: the individual/entity actually operating a site that
          collects payments needs to be identifiable on it, not just in the
          gateway's own backend paperwork. */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">{t("contact.legalTitle")}</CardTitle>
          <div className="mt-2 flex flex-col gap-1 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">{t("contact.legalName")}:</span> Karan Navinbhai Sonaiya
            </p>
            <p>
              <span className="font-medium text-foreground">{t("contact.legalEmailLabel")}:</span>{" "}
              sonaiyakaran339@gmail.com
            </p>
            <p>
              <span className="font-medium text-foreground">{t("contact.legalPhoneLabel")}:</span> +91 8490853065
            </p>
          </div>
        </CardHeader>
      </Card>

      <Button asChild className="mt-8">
        <Link href="/help">{t("help.title")}</Link>
      </Button>
    </div>
  );
}
