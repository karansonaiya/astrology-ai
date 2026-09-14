import { z } from "zod";

const planetSchema = z.object({
  planet: z.string(),
  sign: z.string(),
  house: z.number().nullable(),
  retrograde: z.boolean(),
});

const yogaSchema = z.object({ name: z.string(), description: z.string() });
const aspectSchema = z.object({ from: z.string(), toHouse: z.number(), toPlanets: z.array(z.string()) });

export const kundliExplainSchema = z.object({
  // true = "my own kundli" — server re-fetches the authoritative cached
  // calculation itself (ignores `calculation` below) and caches the result.
  // false = an ad-hoc "someone else's kundli" lookup already shown on
  // screen (see /api/kundli/lookup) — uses the client-supplied calculation
  // directly, not persisted/cached, matching that feature's existing
  // ephemeral (not-saved) design.
  own: z.boolean(),
  name: z.string().max(120).optional(),
  calculation: z
    .object({
      sunSign: z.string().nullable(),
      moonSign: z.string().nullable(),
      ascendant: z.string().nullable(),
      nakshatra: z.string().nullable(),
      planetaryPositions: z.array(planetSchema).nullable(),
      yogas: z.array(yogaSchema).nullable().optional(),
      aspects: z.array(aspectSchema).nullable().optional(),
    })
    .optional(), // required when own === false; validated in the route
});
