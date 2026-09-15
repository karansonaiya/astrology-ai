import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

/**
 * Real face-landmark detection (MediaPipe Face Landmarker, Google's own
 * model — same @mediapipe/tasks-vision package already used by
 * hand-detection/detect-mounts.ts for Palm Reading's mount overlay) — used
 * ONLY to accurately locate five facial regions for the labeled dot
 * overlay: Forehead, Eyes, Nose, Lips, Chin. Deliberately not used to trace
 * any fine feature boundary (eyebrow shape, exact lip contour, etc.) —
 * same reasoning as the hand version: reliable for locating a landmark
 * point, not for tracing a precise outline.
 */
export type FaceFeaturePoint = { label: string; x: number; y: number }; // x/y normalized 0-1, image-relative

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
  }
  return landmarkerPromise;
}

// MediaPipe Face Mesh's 468-point layout: 10 is the top-center of the
// forehead at the hairline, 1 is the nose tip, 13 is the upper-lip center,
// 152 is the chin's lowest point. "Eyes" has no single central landmark, so
// it's the midpoint of the two inner eye corners (133 left, 362 right) —
// still a real, computed-from-real-landmarks point, not an invented one.
const NOSE_TIP = 1;
const UPPER_LIP_CENTER = 13;
const CHIN_BOTTOM = 152;
const FOREHEAD_TOP = 10;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_INNER = 362;

/** Returns null if no face was confidently found in the image — the caller should still allow the AI reading to proceed either way. */
export async function detectFaceFeatures(image: HTMLImageElement): Promise<FaceFeaturePoint[] | null> {
  try {
    const landmarker = await getLandmarker();
    const result = landmarker.detect(image);
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks?.length) return null;

    const leftEyeInner = landmarks[LEFT_EYE_INNER];
    const rightEyeInner = landmarks[RIGHT_EYE_INNER];

    return [
      { label: "Forehead", x: landmarks[FOREHEAD_TOP].x, y: landmarks[FOREHEAD_TOP].y },
      { label: "Eyes", x: (leftEyeInner.x + rightEyeInner.x) / 2, y: (leftEyeInner.y + rightEyeInner.y) / 2 },
      { label: "Nose", x: landmarks[NOSE_TIP].x, y: landmarks[NOSE_TIP].y },
      { label: "Lips", x: landmarks[UPPER_LIP_CENTER].x, y: landmarks[UPPER_LIP_CENTER].y },
      { label: "Chin", x: landmarks[CHIN_BOTTOM].x, y: landmarks[CHIN_BOTTOM].y },
    ];
  } catch {
    // WASM/model failed to load (offline, blocked CDN, etc.) — the feature
    // overlay is a bonus, not a requirement; the real AI reading below
    // doesn't depend on this at all.
    return null;
  }
}
