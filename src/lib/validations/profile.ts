import { z } from "zod";

export const localeUpdateSchema = z.object({
  locale: z.enum(["en", "hi", "gu"]),
});

export const onboardingSchema = z.object({
  locale: z.enum(["en", "hi", "gu"]),
  name: z.string().max(120).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  birthDate: z.string().date().optional(),
  birthTimeKnown: z.boolean().default(true),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  birthCity: z.string().max(120).optional(),
  birthCountry: z.string().max(120).optional(),
  timezone: z.string().max(64).optional(),
  primaryInterest: z.enum([
    "career",
    "marriage",
    "relationship",
    "business",
    "daily_guidance",
    "compatibility",
    "self_reflection",
  ]),
  ageConfirmed: z.boolean(),
  saveBirthDetails: z.boolean(),
  termsAccepted: z.boolean(),
});

export const birthProfileUpdateSchema = z.object({
  name: z.string().max(120).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  birthDate: z.string().date(),
  birthTimeKnown: z.boolean(),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  birthCity: z.string().max(120).optional(),
  birthCountry: z.string().max(120).optional(),
  timezone: z.string().max(64).optional(),
  primaryInterest: z
    .enum(["career", "marriage", "relationship", "business", "daily_guidance", "compatibility", "self_reflection"])
    .optional(),
});
