import { z } from "zod";

export const publicAskSchema = z.object({
  question: z.string().min(3).max(500),
  locale: z.enum(["en", "hi", "gu"]).default("en"),
  captchaToken: z.string().optional(), // required only when CAPTCHA_PROVIDER != "none", see /api/public/ask
});
