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

export const tarotReadingSchema = z.object({
  question: z.string().max(500).optional(),
});

export const vastuSchema = z.object({
  propertyType: z.enum(["home", "office", "shop"]),
  mainDoorDirection: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "center"]),
  elements: z
    .array(
      z.object({
        element: z.enum(["main_door", "kitchen", "master_bedroom", "pooja_room", "toilet", "staircase", "water_source", "cash_locker"]),
        direction: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "center"]),
      })
    )
    .max(8)
    .default([]),
  concern: z.string().max(500).optional(),
});

export const remedySchema = z.object({
  concern: z.string().min(5).max(1000),
});

export const pujaGuidanceSchema = z.object({
  concern: z.string().min(5).max(500),
});

export const pujaBookingRequestSchema = z
  .object({
    pujaCode: z.string().max(80).optional(),
    pujaName: z.string().min(1).max(120),
    preferredDate: z.string().date().optional(),
    contactPhone: z.string().min(4).max(20),
    notes: z.string().max(1000).optional(),
  })
  // Found in a full audit: the <input type="date">'s `min` attribute is
  // only a browser-UI hint (a manually typed/pasted date can still bypass
  // it), so a real server-side check is needed too — otherwise admin sees
  // an already-impossible "pending" request with nothing indicating it
  // can never actually be arranged.
  .refine((v) => !v.preferredDate || v.preferredDate >= new Date().toISOString().slice(0, 10), {
    message: "Preferred date can't be in the past",
    path: ["preferredDate"],
  });

export const productInquirySchema = z.object({
  productId: z.string().min(1),
  contactName: z.string().min(1).max(120),
  contactPhone: z.string().min(4).max(20),
  message: z.string().max(1000).optional(),
});
