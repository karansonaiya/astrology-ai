import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { pujaBookingRequestSchema } from "@/lib/validations/insights";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await requireUser();
    const requests = await prisma.pujaBookingRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ requests });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = await rateLimit("puja-request-create", user.id, 10, 3600);
    if (!limit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = pujaBookingRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const request = await prisma.pujaBookingRequest.create({
      data: {
        userId: user.id,
        pujaCode: parsed.data.pujaCode,
        pujaName: parsed.data.pujaName,
        preferredDate: parsed.data.preferredDate ? new Date(`${parsed.data.preferredDate}T00:00:00.000Z`) : undefined,
        contactPhone: parsed.data.contactPhone,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ request });
  } catch (err) {
    return errorResponse(err);
  }
}
