import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { renderReportPdf } from "@/lib/pdf/render-report-pdf";
import type { AppLocale } from "@/lib/i18n/config";

type ReportBody = { templateName?: string; body: string; generatedAt: string; birthDataUsed: boolean };

/**
 * Generates the PDF on-demand for this specific request rather than
 * pre-rendering/storing one — see render-report-pdf.tsx's header comment
 * for why (no blob storage wired up anywhere in this app; ReportPurchase.
 * pdfUrl stays unused, same as before this feature).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const purchase = await prisma.reportPurchase.findFirst({
      where: { id, userId: user.id },
      select: { status: true, generatedContent: true, template: { select: { name: true } } },
    });
    if (!purchase) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (purchase.status !== "completed" || !purchase.generatedContent) {
      return NextResponse.json({ error: "not_ready" }, { status: 409 });
    }

    const content = purchase.generatedContent as unknown as ReportBody;
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const locale = (dbUser?.locale ?? "en") as AppLocale;

    const pdfBuffer = await renderReportPdf({
      templateName: content.templateName ?? purchase.template?.name ?? "Report",
      body: content.body,
      generatedAt: content.generatedAt,
      birthDataUsed: content.birthDataUsed,
      locale,
    });

    // A Node Buffer isn't directly a valid BodyInit for NextResponse's
    // underlying fetch Response type in this Next.js version — wrap it in a
    // Uint8Array view, which is.
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(content.templateName ?? purchase.template?.name ?? "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
