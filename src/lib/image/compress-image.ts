/**
 * Browser-only: downscale + re-encode a picked image file via <canvas>
 * before it's sent anywhere. Found live: a REAL palm photo taken directly
 * with a phone camera failed on the Palm Reading page — a modern phone
 * camera photo is routinely 5-12MB at native resolution (a 4000x3000 12MP
 * JPEG comes out around 8MB), while MAX_IMAGE_BASE64_LENGTH (validations/
 * chat.ts) caps raw image bytes at ~4MB — every real "take a photo right
 * now" flow (chat attachments, Palm Reading, the paid Palm Report
 * checkout) was hitting the flat "image too large" rejection with no way
 * for a non-technical user to shrink the photo themselves first.
 *
 * 1600px on the long side is comfortably enough detail for both this
 * project's MediaPipe hand-mount detection (which only needs to locate 21
 * keypoints, not read fine print) and the AI vision reading/analysis calls
 * — nothing meaningful is lost by downscaling before either.
 */
export async function compressImageFile(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {}
): Promise<{ data: string; mimeType: string }> {
  const maxDimension = opts.maxDimension ?? 1600;
  const quality = opts.quality ?? 0.82;

  const bitmap = await createImageBitmap(file).catch(() => null);
  // Some browsers can't decode certain inputs client-side (e.g. HEIC in a
  // few desktop browsers) — fall back to the original file untouched; the
  // caller's existing size check still applies as a backstop.
  if (!bitmap) return { data: await blobToBase64(file), mimeType: file.type };

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { data: await blobToBase64(file), mimeType: file.type };
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return { data: await blobToBase64(file), mimeType: file.type };

  return { data: await blobToBase64(blob), mimeType: "image/jpeg" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
