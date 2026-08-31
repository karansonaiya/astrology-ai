import { z } from "zod";

// E.164-ish: leading +, country code, 8-15 digits total — matches what the
// login form normalizes phone input to before sending (spaces/dashes
// stripped client-side, see login/page.tsx's normalizeDestination).
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

const destinationField = z.string().min(4).max(120);

export const otpRequestSchema = z
  .object({
    destination: destinationField,
    channel: z.enum(["phone", "email"]),
  })
  .refine(
    (v) => (v.channel === "phone" ? PHONE_RE.test(v.destination) : z.string().email().safeParse(v.destination).success),
    { message: "Invalid destination for the given channel", path: ["destination"] }
  );

export const otpVerifySchema = z
  .object({
    destination: destinationField,
    channel: z.enum(["phone", "email"]),
    code: z.string().length(6),
  })
  .refine(
    (v) => (v.channel === "phone" ? PHONE_RE.test(v.destination) : z.string().email().safeParse(v.destination).success),
    { message: "Invalid destination for the given channel", path: ["destination"] }
  );
