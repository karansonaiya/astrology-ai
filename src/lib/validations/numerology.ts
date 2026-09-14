import { z } from "zod";

export const numerologySchema = z.object({
  name: z.string().trim().min(1).max(120),
  birthDate: z.string().date(),
});
