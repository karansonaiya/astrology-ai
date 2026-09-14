import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Explicit select — NOT `include` — so the new photoData Bytes column
    // (palm reports' real uploaded photo) never gets serialized into this
    // JSON response; nothing in the UI needs it back, only the server-side
    // generation step (entitlement.ts) ever reads it.
    const purchase = await prisma.reportPurchase.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        createdAt: true,
        status: true,
        generatedContent: true,
        template: { select: { name: true } },
        birthProfile: { select: { birthDate: true, birthCity: true } },
      },
    });
    if (!purchase) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ purchase });
  } catch (err) {
    return errorResponse(err);
  }
}
