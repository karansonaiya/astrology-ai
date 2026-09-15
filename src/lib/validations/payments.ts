import { z } from "zod";
import { chatImageSchema } from "@/lib/validations/chat";

export const createOrderSchema = z.object({
  type: z.enum(["credit_pack", "report", "subscription"]),
  code: z.string().min(1).max(80),
  birthProfileId: z.string().optional(),
  // Palm Report templates only (see pricing/catalog.ts's PALM_REPORT_CODES) —
  // reuses the exact same base64 image shape/size cap already validated for
  // chat image attachments. create-order/route.ts requires this to be
  // present for those specific codes and rejects it for every other type.
  photo: chatImageSchema.optional(),
  // Full Numerology Report only (NUMEROLOGY_REPORT_CODES) — required the
  // same way `photo` is required for palm codes.
  numerologyName: z.string().trim().min(1).max(120).optional(),
  numerologyBirthDate: z.string().date().optional(),
  // Full Baby Name Report only (BABY_NAME_REPORT_CODES) — required the
  // same way, just more fields (the real Nakshatra+pada lookup needs
  // birth place too, not just date).
  babyNameInput: z
    .object({
      birthDate: z.string().date(),
      birthTimeKnown: z.boolean(),
      birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      birthCity: z.string().min(1).max(120),
      birthCountry: z.string().max(120).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      genderPreference: z.enum(["boy", "girl", "any"]),
    })
    .optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
});

export const refundRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(5).max(1000),
});
