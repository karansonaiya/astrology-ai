import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

/**
 * Synchronous data-export: builds a JSON snapshot of the user's own data
 * and returns it directly. A production deployment with large datasets may
 * prefer to generate this asynchronously (DataExportRequest.status =
 * processing -> ready) and deliver via signed URL — the model is already in
 * the schema for that.
 */
export async function POST() {
  try {
    const user = await requireUser();

    const [profile, birthProfiles, chats, orders, referral] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id } }),
      prisma.birthProfile.findMany({ where: { userId: user.id, deletedAt: null } }),
      prisma.chat.findMany({ where: { userId: user.id, deletedAt: null }, include: { messages: true } }),
      prisma.order.findMany({ where: { userId: user.id } }),
      prisma.referral.findMany({ where: { referrerId: user.id } }),
    ]);

    await prisma.dataExportRequest.create({
      data: { userId: user.id, status: "ready", completedAt: new Date() },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profile ? { ...profile, passwordHash: undefined } : null,
      birthProfiles,
      chats,
      orders,
      referral,
    };

    return NextResponse.json(exportData, {
      headers: { "Content-Disposition": "attachment; filename=prerna-ai-data-export.json" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
