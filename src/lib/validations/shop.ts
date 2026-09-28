import { z } from "zod";

// Admin picks a real product photo (compressed client-side via
// compressImageFile into a data: URI, same pattern as chat/palm-reading
// image attachments) rather than typing in a hosted image URL — most
// spiritual-shop admins have a photo on their phone, not an existing public
// link. A real https:// URL still validates too, for the rare product that
// already has one (e.g. a supplier's own hosted photo).
const IMAGE_DATA_URI_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
export const MAX_PRODUCT_IMAGE_LENGTH = 2_000_000; // ~1.5MB raw — generous for a compressed 800px thumbnail

export const productImageSchema = z
  .string()
  .max(MAX_PRODUCT_IMAGE_LENGTH)
  .refine((v) => /^https?:\/\//.test(v) || IMAGE_DATA_URI_RE.test(v), {
    message: "must be a valid image URL or an uploaded photo",
  });
