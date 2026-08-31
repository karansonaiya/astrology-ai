import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const flags = await prisma.featureFlag.findMany();
  const map = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
  return NextResponse.json({ flags: map });
}
