import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/auth/guard";

// Powers the red-dot notification on the header's Admin button — a
// lightweight signal that a real support ticket, shop inquiry, or puja
// booking request is sitting untouched, without the admin having to
// remember to check each of those three pages by hand. Same admin/
// support_agent role gate as the three pages themselves (content_editor
// can't act on any of these, so it never sees the dot).
export async function GET() {
  try {
    await requireAdmin(["admin", "support_agent"]);
    const [openTickets, newInquiries, pendingPujaRequests] = await Promise.all([
      prisma.supportTicket.count({ where: { status: "open" } }),
      prisma.productInquiry.count({ where: { status: "new" } }),
      prisma.pujaBookingRequest.count({ where: { status: "pending" } }),
    ]);
    return NextResponse.json({ total: openTickets + newInquiries + pendingPujaRequests });
  } catch (err) {
    return errorResponse(err);
  }
}
