import { NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { getOrCreateWallet } from "@/lib/credits";

export async function GET() {
  try {
    const user = await requireUser();
    const wallet = await getOrCreateWallet(user.id);
    return NextResponse.json({
      balance: wallet.balance,
      freeQuestionsRemaining: Math.max(0, wallet.freeQuestionsCap - wallet.freeQuestionsUsed),
      freeQuestionsCap: wallet.freeQuestionsCap,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
