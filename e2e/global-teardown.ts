import { PrismaClient } from "@prisma/client";
import { E2E_LOGIN_EMAIL, E2E_SIGNUP_EMAIL_PREFIX } from "./test-users";

// Removes every trace of this run's test accounts from the real database —
// the seeded login/logout user, and any account the signup test created —
// so the live/local Users table never accumulates Playwright test data.
export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try {
    await prisma.user.deleteMany({
      where: { OR: [{ email: E2E_LOGIN_EMAIL }, { email: { startsWith: E2E_SIGNUP_EMAIL_PREFIX } }] },
    });
  } finally {
    await prisma.$disconnect();
  }
}
