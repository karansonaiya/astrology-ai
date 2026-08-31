import { z } from "zod";

export const panchangQuerySchema = z.object({
  city: z.string().max(120).default("Ahmedabad"),
  country: z.string().max(120).default("India"),
  date: z.string().date().optional(), // defaults to today server-side
});

export const panchangMonthQuerySchema = z.object({
  city: z.string().max(120).default("Ahmedabad"),
  country: z.string().max(120).default("India"),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
