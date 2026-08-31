import { z } from "zod";

export const kundliLookupSchema = z.object({
  name: z.string().max(120).optional(),
  birthDate: z.string().date(),
  birthTimeKnown: z.boolean().default(true),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  birthCity: z.string().min(1).max(120),
  birthCountry: z.string().max(120).optional(),
});
