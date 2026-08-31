import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";

export async function POST() {
  try {
    const user = await requireUser();

    await prisma.$transaction([
      prisma.birthProfile.updateMany({ where: { userId: user.id }, data: { deletedAt: new Date() } }),
      prisma.chat.updateMany({ where: { userId: user.id }, data: { deletedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          status: "deleted",
          deletedAt: new Date(),
          email: null,
          phone: null,
          name: null,
          image: null,
          passwordHash: null,
        },
      }),
      prisma.auditLog.create({
        data: { actorId: user.id, action: "account.self_delete", targetType: "User", targetId: user.id },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
