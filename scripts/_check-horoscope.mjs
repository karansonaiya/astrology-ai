import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const rows = await prisma.horoscopeContent.findMany({
  where: { zodiacSign: "aries" },
  select: { id: true, zodiacSign: true, period: true, locale: true, periodDate: true, status: true, publishedAt: true, createdAt: true },
  orderBy: { createdAt: "desc" },
});
console.log("Now (server):", new Date().toISOString());
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
