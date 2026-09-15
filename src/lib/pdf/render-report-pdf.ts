import { readFileSync } from "node:fs";
import path from "node:path";
import type { AppLocale } from "@/lib/i18n/config";
import { detectReplyLocale } from "@/lib/ai";

/**
 * Renders a purchased report's already-generated markdown `body` (see
 * src/lib/payments/entitlement.ts — every generate*ReportContent function
 * returns the same {templateName, body, generatedAt, birthDataUsed} shape)
 * into a real downloadable PDF. Generated on-demand per request rather than
 * pre-rendered and stored (no blob/file storage is wired up anywhere in
 * this app — see ReportPurchase.pdfUrl, always null, never written to) -
 * simplest correct approach that needs no new infra dependency.
 *
 * FOUND LIVE, real bug in the first approach tried here: @react-pdf/renderer
 * (a pure-JS PDF library, no headless Chrome) was tried first specifically
 * to avoid Chromium's serverless cold-start cost - but its underlying
 * fontkit text layout has no real complex-script shaping (no HarfHuzz-
 * equivalent), so real Devanagari text partially misrendered (matras/
 * conjuncts not reordered) and real Gujarati text threw a hard crash
 * ("Cannot read properties of null (reading 'xCoordinate')") from inside
 * its glyph-layout code. Both are real script-shaping bugs in that
 * library, not something fixable by picking a different font file - so
 * this now uses headless Chromium instead (Chromium's own text engine
 * shapes Devanagari/Gujarati correctly, same as it does when a customer's
 * own browser already renders their hi/gu report correctly today).
 *
 * puppeteer-core + @sparticuz/chromium is the standard pattern for
 * Chromium-based PDF generation on Vercel serverless (this app's
 * deployment target - see vercel.json); on this project's actual Windows
 * dev machine (no Lambda environment, @sparticuz/chromium's Linux binary
 * won't run) it falls back to the full `puppeteer` package's own bundled,
 * OS-matching Chromium instead, dev-only (devDependency).
 */

const FONTS_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");

let devanagariDataUri: string | null = null;
let gujaratiDataUri: string | null = null;

function fontDataUri(fileName: string): string {
  const bytes = readFileSync(path.join(FONTS_DIR, fileName));
  return `data:font/ttf;base64,${bytes.toString("base64")}`;
}

/** Real Noto Sans Devanagari/Gujarati, embedded as a base64 @font-face — Helvetica-equivalent system fonts don't cover these scripts at all. English needs no special font (a normal sans-serif already covers Latin). */
function fontFaceCss(locale: AppLocale): { css: string; bodyFontFamily: string } {
  if (locale === "hi") {
    devanagariDataUri ??= fontDataUri("NotoSansDevanagari-Regular.ttf");
    return { css: `@font-face { font-family: "ReportFont"; src: url(${devanagariDataUri}) format("truetype"); }`, bodyFontFamily: "ReportFont, sans-serif" };
  }
  if (locale === "gu") {
    gujaratiDataUri ??= fontDataUri("NotoSansGujarati-Regular.ttf");
    return { css: `@font-face { font-family: "ReportFont"; src: url(${gujaratiDataUri}) format("truetype"); }`, bodyFontFamily: "ReportFont, sans-serif" };
  }
  return { css: "", bodyFontFamily: "Helvetica, Arial, sans-serif" };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** **bold** -> <strong> — applied AFTER escaping so escaping never touches the ** markers themselves. */
function inlineHtml(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/**
 * A deliberately minimal markdown-to-HTML parser scoped to exactly what
 * this app's AI-generated report bodies actually produce (see
 * entitlement.ts's report prompts: "###"-style section headers, numbered/
 * bulleted suggestion lists, plain paragraphs, occasional **bold**
 * emphasis) - not a general-purpose markdown renderer, since that's more
 * than this real content ever needs.
 */
function markdownToHtml(markdown: string): string {
  const parts: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? "ol" : "ul";
    parts.push(`<${tag}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${tag}>`);
    list = null;
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    const ol = line.match(/^(\d+)[.)]\s+(.*)/);
    const ul = line.match(/^[-*]\s+(.*)/);
    if (h3) {
      flushList();
      parts.push(`<h3>${inlineHtml(h3[1])}</h3>`);
    } else if (h2) {
      flushList();
      parts.push(`<h2>${inlineHtml(h2[1])}</h2>`);
    } else if (h1) {
      flushList();
      parts.push(`<h1>${inlineHtml(h1[1])}</h1>`);
    } else if (ol) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(inlineHtml(ol[2]));
    } else if (ul) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(inlineHtml(ul[1]));
    } else {
      flushList();
      parts.push(`<p>${inlineHtml(line)}</p>`);
    }
  }
  flushList();
  return parts.join("\n");
}

function buildHtml(input: { templateName: string; body: string; generatedAt: string; locale: AppLocale }): string {
  const { css: fontFaceRule, bodyFontFamily } = fontFaceCss(input.locale);
  const dateLabel = new Date(input.generatedAt).toLocaleDateString(
    input.locale === "hi" ? "hi-IN" : input.locale === "gu" ? "gu-IN" : "en-IN",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8" />
<style>
  ${fontFaceRule}
  * { box-sizing: border-box; }
  body { font-family: ${bodyFontFamily}; font-size: 12px; line-height: 1.65; color: #262019; margin: 0; padding: 0 44px; }
  .report-title { font-size: 21px; color: #8a5a10; margin: 0 0 4px; font-weight: 700; }
  .meta { font-size: 10px; color: #6b6355; margin: 0 0 18px; }
  h1, h2, h3 { margin: 16px 0 8px; font-weight: 700; }
  h1 { font-size: 16.5px; } h2 { font-size: 14.5px; } h3 { font-size: 13px; }
  p { margin: 0 0 9px; }
  ol, ul { margin: 0 0 10px; padding-left: 22px; }
  li { margin-bottom: 6px; }
  strong { font-weight: 700; }
</style>
</head>
<body>
  <p class="report-title">${escapeHtml(input.templateName)}</p>
  <p class="meta">${escapeHtml(dateLabel)}</p>
  ${markdownToHtml(input.body)}
</body>
</html>`;
}

async function getBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { launch } = await import("puppeteer-core");
    return launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  }
  // Local/dev only — the full `puppeteer` package (devDependency) bundles
  // its own OS-matching Chromium, unlike @sparticuz/chromium's Lambda-only
  // Linux binary which can't run on a Windows dev machine.
  const { launch } = await import("puppeteer");
  return launch({ headless: true });
}

export type ReportPdfInput = {
  templateName: string;
  body: string;
  generatedAt: string;
  birthDataUsed: boolean;
  locale: AppLocale;
};

export async function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  // Detected from the real body text, not just trusted from input.locale —
  // the account's locale preference may have changed since this report was
  // generated, and the PDF's font must match what the text ACTUALLY is or
  // Devanagari/Gujarati characters render as blank boxes.
  const effectiveLocale = detectReplyLocale(input.body, input.locale);
  const html = buildHtml({ templateName: input.templateName, body: input.body, generatedAt: input.generatedAt, locale: effectiveLocale });

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    // "load" is enough here (not "networkidle0", which this Puppeteer
    // version's setContent() doesn't even accept) — the font is a base64
    // data: URI already inline in the HTML, no real network fetch happens.
    await page.setContent(html, { waitUntil: "load" });
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "26px", bottom: "40px", left: "0px", right: "0px" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="width:100%;text-align:center;font-size:8px;color:#9b9385;font-family:Helvetica,Arial,sans-serif;">Prerna AI &middot; <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
