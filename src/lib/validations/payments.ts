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
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
});

export const refundRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(5).max(1000),
});
