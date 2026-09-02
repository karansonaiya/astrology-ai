import { z } from "zod";

export const createOrderSchema = z.object({
  type: z.enum(["credit_pack", "report", "subscription"]),
  code: z.string().min(1).max(80),
  birthProfileId: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
});

export const refundRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(5).max(1000),
});
