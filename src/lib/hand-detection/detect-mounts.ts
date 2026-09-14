import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

/**
 * Real hand-landmark detection (MediaPipe Hands, Google's own model) — used
 * ONLY to accurately locate the four finger-base "mounts" traditional
 * palmistry names after planets (Jupiter/Saturn/Sun/Mercury) plus the thumb-
 * base Mount of Venus. Deliberately not used to trace the actual palm lines
 * (life/heart/head) — MediaPipe's 21 landmarks describe finger joints and
 * the wrist, not skin creases, so there is nothing here to base a line
 * overlay on; see palm-reading.ts's header comment for why lines stay
 * text-only instead of a drawn (and likely inaccurate) overlay.
 */
export type HandMount = { label: string; x: number; y: number }; // x/y normalized 0-1, image-relative

let landmarkerPromise: Promise<HandLandmarker> | null = null;

function getLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numHands: 1,
      });
    })();
  }
  return landmarkerPromise;
}

// MediaPipe Hands' 21-point layout: index/middle/ring/pinky MCP (base)
// joints are landmarks 5/9/13/17 respectively; the thumb's CMC joint (1) is
// the closest landmark to where the Mount of Venus sits at the thumb's base.
const MOUNT_LANDMARKS: { index: number; label: string }[] = [
  { index: 5, label: "Jupiter" },
  { index: 9, label: "Saturn" },
  { index: 13, label: "Sun" },
  { index: 17, label: "Mercury" },
  { index: 1, label: "Venus" },
];

/** Returns null if no hand was confidently found in the image - the caller should still allow the AI reading to proceed either way. */
export async function detectHandMounts(image: HTMLImageElement): Promise<HandMount[] | null> {
  try {
    const landmarker = await getLandmarker();
    const result = landmarker.detect(image);
    const landmarks = result.landmarks?.[0];
    if (!landmarks?.length) return null;

    return MOUNT_LANDMARKS.map(({ index, label }) => ({
      label,
      x: landmarks[index].x,
      y: landmarks[index].y,
    }));
  } catch {
    // WASM/model failed to load (offline, blocked CDN, etc.) - the mount
    // overlay is a bonus, not a requirement; the real AI reading below
    // doesn't depend on this at all.
    return null;
  }
}
