import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

// Publishing is a deliberate, separate admin action — content is never
// auto-published straight out of a generation workflow (per product policy).
const patchSchema = z.object({
  status: z.enum(["draft", "in_review", "published", "archived"]).optional(),
  career: z.string().optional(),
  love: z.string().optional(),
  money: z.string().optional(),
  wellness: z.string().optional(),
  luckyColor: z.string().optional(),
  luckyNumber: z.string().optional(),
  reflection: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["admin", "content_editor"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    if (parsed.data.status === "published" && admin.role !== "admin" && admin.role !== "content_editor") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const content = await prisma.horoscopeContent.update({
      where: { id },
      data: {
        ...parsed.data,
        reviewedBy: parsed.data.status === "published" ? admin.id : undefined,
        publishedAt: parsed.data.status === "published" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ content });
  } catch (err) {
    return errorResponse(err);
  }
}
