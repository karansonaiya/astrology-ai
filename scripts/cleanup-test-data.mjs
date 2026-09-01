// Deletes known dev/seed/test accounts before a real launch — NOT a
// throwaway script, kept for future use (e.g. before each fresh launch
// cycle, or to wipe a staging DB). Always inspect the printed list and
// confirm before it deletes anything for real (see DRY RUN below).
//
// Scope, deliberately explicit rather than a pattern match, so a real
// user account can never be swept up by accident:
//   - The two prisma/seed.ts demo accounts (admin@jyoti.ai, demo@jyoti.ai)
//   - Any user whose phone matches the +9199999000xx range used throughout
//     this project's live-testing sessions (see CLAUDE.md's testing
//     discipline — these were always throwaway numbers, never real ones)
//
// Run with: node scripts/cleanup-test-data.mjs        (dry run — lists only)
//           node scripts/cleanup-test-data.mjs --yes   (actually deletes)
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SEED_EMAILS = ["admin@jyoti.ai", "demo@jyoti.ai"];
const TEST_PHONE_RE = /^\+9199999000\d\d$/;

async function main() {
  const confirmed = process.argv.includes("--yes");

  const candidates = await prisma.user.findMany({
    where: {
      OR: [{ email: { in: SEED_EMAILS } }, { phone: { not: null } }],
    },
    select: { id: true, phone: true, email: true, name: true, createdAt: true },
  });

  const toDelete = candidates.filter(
    (u) => (u.email && SEED_EMAILS.includes(u.email)) || (u.phone && TEST_PHONE_RE.test(u.phone))
  );

  if (toDelete.length === 0) {
    console.log("No known test/seed accounts found. Nothing to do.");
    return;
  }

  console.log(`${confirmed ? "Deleting" : "Would delete (dry run — pass --yes to actually delete)"}:`);
  for (const u of toDelete) console.log(`  ${u.id}  ${u.email ?? u.phone}  "${u.name ?? ""}"  created ${u.createdAt.toISOString()}`);

  if (!confirmed) {
    console.log("\nDry run only — nothing was deleted. Re-run with --yes to actually delete these.");
    return;
  }

  for (const u of toDelete) {
    // Cascades (Chat->Message, BirthProfile->KundliCalculation, CreditWallet,
    // etc.) are all onDelete: Cascade in schema.prisma from User, so a plain
    // user delete is sufficient.
    await prisma.user.delete({ where: { id: u.id } });
  }
  console.log(`\nDeleted ${toDelete.length} account(s).`);
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
