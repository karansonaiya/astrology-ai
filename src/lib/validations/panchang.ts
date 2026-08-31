import { z } from "zod";

// lat/lng are set when the user picked a CityAutocomplete suggestion —
// skips a second, potentially-mismatched free-text geocode of city/country.
const coordsShape = {
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
};

export const panchangQuerySchema = z.object({
  city: z.string().max(120).default("Ahmedabad"),
  country: z.string().max(120).default("India"),
  date: z.string().date().optional(), // defaults to today server-side
  ...coordsShape,
});

export const panchangMonthQuerySchema = z.object({
  city: z.string().max(120).default("Ahmedabad"),
  country: z.string().max(120).default("India"),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  ...coordsShape,
});
