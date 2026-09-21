import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { errorResponse } from "@/lib/auth/guard";
import { productInquirySchema } from "@/lib/validations/insights";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// No login required — this is a lead-capture form on the public shop page,
// same "browsing shouldn't need an account" reasoning as GET /products.
// Attaches the real userId when the visitor happens to be signed in, but
// never blocks an anonymous one.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit("product-inquiry", ip, 10, 3600);
    if (!limit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = productInquirySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const product = await prisma.spiritualProduct.findFirst({ where: { id: parsed.data.productId, active: true } });
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const session = await auth();

    const inquiry = await prisma.productInquiry.create({
      data: {
        productId: product.id,
        userId: session?.user?.id,
        contactName: parsed.data.contactName,
        contactPhone: parsed.data.contactPhone,
        message: parsed.data.message,
      },
    });

    return NextResponse.json({ inquiry });
  } catch (err) {
    return errorResponse(err);
  }
}
