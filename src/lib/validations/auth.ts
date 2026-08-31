import { z } from "zod";

export const otpRequestSchema = z.object({
  destination: z.string().min(4).max(120),
  channel: z.enum(["phone", "email"]),
});

export const otpVerifySchema = z.object({
  destination: z.string().min(4).max(120),
  channel: z.enum(["phone", "email"]),
  code: z.string().length(6),
});

export const signupPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().max(120).optional(),
  ageConfirmed: z.literal(true, "You must confirm you are 18+ or have guardian consent."),
  termsAccepted: z.literal(true, "You must accept the Terms and Privacy Policy."),
});
