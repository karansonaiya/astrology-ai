import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { localeUpdateSchema } from "@/lib/validations/profile";

// Best-effort persistence of the selected UI language onto the user's
// profile. No-ops silently for anonymous visitors — locale still lives in
// the cookie for them (see I18nProvider), which is all that's needed.
export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => null);
  const parsed = localeUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { locale: parsed.data.locale } });
  }

  return NextResponse.json({ ok: true });
}
