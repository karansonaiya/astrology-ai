import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const templates = await prisma.reportTemplate.findMany({ where: { active: true }, orderBy: { priceInPaise: "asc" } });
    return NextResponse.json({ templates });
  } catch (err) {
    return errorResponse(err);
  }
}
