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
  // Set when the user picked a CityAutocomplete suggestion — lets the route
  // skip a second, potentially-mismatched free-text geocode of birthCity.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().max(64).optional(),
  primaryInterest: z
    .enum(["career", "marriage", "relationship", "business", "daily_guidance", "compatibility", "self_reflection"])
    .optional(),
});
