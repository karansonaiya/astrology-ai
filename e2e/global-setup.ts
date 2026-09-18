import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { E2E_LOGIN_EMAIL, E2E_PASSWORD } from "./test-users";

// Seeds one persistent, already-onboarded test account for the login/logout
// spec — deliberately NOT created through the signup UI, so that spec is
// only ever testing login+logout, not re-testing signup (auth.spec.ts's own
// "sign up" test covers that path separately, with its own throwaway user).
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(E2E_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: E2E_LOGIN_EMAIL },
      update: { passwordHash, status: "active", onboardingCompletedAt: new Date() },
      create: {
        email: E2E_LOGIN_EMAIL,
        passwordHash,
        ageConfirmed: true,
        onboardingCompletedAt: new Date(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
