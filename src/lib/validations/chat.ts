import { z } from "zod";

// Base64 payload cap — ~4MB raw image (base64 inflates size by ~4/3).
export const MAX_IMAGE_BASE64_LENGTH = 5_600_000;
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;

export const chatImageSchema = z.object({
  data: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH), // raw base64, no "data:...;base64," prefix
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
});

export const sendMessageSchema = z
  .object({
    content: z.string().max(2000).default(""),
    image: chatImageSchema.optional(),
  })
  .refine((v) => v.content.trim().length > 0 || v.image, {
    message: "content or image is required",
    path: ["content"],
  });

export const feedbackSchema = z.object({
  rating: z.enum(["helpful", "not_helpful"]),
});

export const reportSchema = z.object({
  reason: z.string().min(3).max(500),
});
