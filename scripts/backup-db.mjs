// Manual DB snapshot — insurance against Supabase's free tier having NO
// automated backups (Pro plan adds 7-day automatic backups; free has none).
// Run anytime with: node scripts/backup-db.mjs
// Writes a single JSON file (all tables) to /backups (gitignored — contains
// real user PII: phones, emails, chat messages). Copy the file somewhere
// off this machine periodically (cloud drive, external disk) — a backup
// that only lives on the same laptop as everything else isn't much of one.
import { PrismaClient, Prisma } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

function toCamelCase(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function main() {
  const models = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const dump = {};
  let totalRows = 0;

  console.log(`Backing up ${models.length} tables...`);
  for (const modelName of models) {
    const key = toCamelCase(modelName);
    const rows = await prisma[key].findMany();
    dump[modelName] = rows;
    totalRows += rows.length;
    console.log(`  ${modelName}: ${rows.length} rows`);
  }

  const backupsDir = join(process.cwd(), "backups");
  mkdirSync(backupsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = join(backupsDir, `backup-${timestamp}.json`);
  writeFileSync(outFile, JSON.stringify(dump, null, 2));

  console.log(`\nDone: ${totalRows} total rows across ${models.length} tables.`);
  console.log(`Saved to: ${outFile}`);
  console.log(`Reminder: copy this file somewhere off this machine (Google Drive, external disk, etc.) — it's gitignored and never leaves your laptop otherwise.`);
}

main()
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
