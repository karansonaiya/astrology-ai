import { z } from "zod";

export const muhuratSchema = z.object({
  eventType: z.enum(["general", "travel", "business_start"]),
  date: z.string().date(),
  city: z.string().min(1).max(120),
  country: z.string().max(120).optional(),
  // Set when the user picked a CityAutocomplete suggestion — skips a
  // second, potentially-mismatched free-text geocode of city.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
