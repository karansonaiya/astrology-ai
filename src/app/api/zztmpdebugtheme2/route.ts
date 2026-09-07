import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const store = await cookies();
  return NextResponse.json({
    all: store.getAll(),
    themeRaw: store.get("prerna_theme") ?? null,
  });
}
