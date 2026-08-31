import { z } from "zod";

const personSchema = z.object({
  label: z.string().max(60).optional(),
  birthDate: z.string().date(),
  birthTimeKnown: z.boolean().default(true),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  birthCity: z.string().max(120).optional(),
  birthCountry: z.string().max(120).optional(),
  // Set when the user picked a CityAutocomplete suggestion — skips a
  // second, potentially-mismatched free-text geocode of birthCity.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const compatibilitySchema = z.object({
  personA: personSchema,
  personB: personSchema,
  savePersonBConsent: z.boolean().default(false),
});

export const careerInsightSchema = z.object({
  currentWork: z.string().max(300),
  skills: z.string().max(300),
  goals: z.string().max(500),
  timeHorizon: z.enum(["3_months", "6_months", "1_year", "3_years"]),
  mainConcern: z.string().max(500),
});

export const relationshipInsightSchema = z.object({
  situation: z.string().min(5).max(1500),
});
