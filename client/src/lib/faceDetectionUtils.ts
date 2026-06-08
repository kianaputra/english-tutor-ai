/**
 * Face Detection Utilities
 * Provides helper functions for face detection and distance estimation
 */

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceData {
  detected: boolean;
  box?: FaceBox;
  confidence: number;
  distance: number; // 0-1, where 0 is far, 1 is close
}

/**
 * Estimate distance based on face bounding box size
 * Assumes calibration: face width ~150px at 2 meters distance
 * @param faceWidth - Width of face bounding box in pixels
 * @param cameraWidth - Camera frame width in pixels
 * @returns Distance ratio (0-1), where 1 is very close
 */
export function estimateDistance(faceWidth: number, cameraWidth: number = 320): number {
  // Normalize face width to camera width
  const normalizedWidth = faceWidth / cameraWidth;

  // Rough calibration: 0.2 normalized width ≈ 2 meters
  // This is a simplified model and should be calibrated for your specific use case
  const distance = Math.max(0, Math.min(1, 0.2 / normalizedWidth));

  return distance;
}

/**
 * Simple skin tone detection using RGB values
 * Returns the ratio of skin-like pixels to total pixels
 * @param imageData - Canvas ImageData
 * @returns Skin pixel ratio (0-1)
 */
export function detectSkinTone(imageData: ImageData): number {
  const data = imageData.data;
  let skinPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Skin tone detection heuristic
    // Adjustable thresholds for different skin tones
    if (
      r > 95 &&
      g > 40 &&
      b > 20 &&
      r > g &&
      r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 15
    ) {
      skinPixels++;
    }
  }

  return skinPixels / (imageData.width * imageData.height);
}

/**
 * Find face bounding box using simple motion detection
 * @param imageData - Canvas ImageData
 * @returns Face bounding box or null if not detected
 */
export function findFaceBox(imageData: ImageData): FaceBox | null {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let foundFace = false;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const y = Math.floor(pixelIndex / width);
    const x = pixelIndex % width;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Skin tone detection
    if (
      r > 95 &&
      g > 40 &&
      b > 20 &&
      r > g &&
      r > b &&
      Math.abs(r - g) > 15
    ) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      foundFace = true;
    }
  }

  if (!foundFace || minX >= maxX || minY >= maxY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate face confidence based on multiple factors
 * @param skinRatio - Ratio of skin-like pixels
 * @param boxSize - Size of face bounding box relative to frame
 * @returns Confidence score (0-1)
 */
export function calculateFaceConfidence(skinRatio: number, boxSize: number): number {
  // Weighted combination of skin ratio and box size
  const skinConfidence = Math.min(1, skinRatio * 3);
  const sizeConfidence = Math.min(1, boxSize * 2);

  return (skinConfidence * 0.6 + sizeConfidence * 0.4);
}

/**
 * Smooth distance values over time using exponential moving average
 * Reduces jitter in distance estimation
 * @param newValue - New distance value
 * @param previousValue - Previous smoothed value
 * @param alpha - Smoothing factor (0-1), higher = more responsive
 * @returns Smoothed distance value
 */
export function smoothDistance(newValue: number, previousValue: number, alpha: number = 0.3): number {
  return previousValue * (1 - alpha) + newValue * alpha;
}

/**
 * Check if face is within close distance threshold
 * @param distance - Distance ratio (0-1)
 * @param threshold - Distance threshold (default 0.15 = ~2 meters)
 * @returns True if face is within threshold
 */
export function isFaceClose(distance: number, threshold: number = 0.15): boolean {
  return distance < threshold;
}

/**
 * Calculate face center point
 * @param box - Face bounding box
 * @returns Center point {x, y}
 */
export function getFaceCenter(box: FaceBox): { x: number; y: number } {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Check if face is looking at camera (simplified)
 * Based on face position in frame (should be roughly centered)
 * @param box - Face bounding box
 * @param frameWidth - Frame width
 * @param frameHeight - Frame height
 * @returns True if face is roughly centered
 */
export function isFaceLookingAtCamera(
  box: FaceBox,
  frameWidth: number,
  frameHeight: number
): boolean {
  const center = getFaceCenter(box);
  const frameCenterX = frameWidth / 2;
  const frameCenterY = frameHeight / 2;

  // Allow 30% deviation from center
  const tolerance = 0.3;
  const xDeviation = Math.abs(center.x - frameCenterX) / frameCenterX;
  const yDeviation = Math.abs(center.y - frameCenterY) / frameCenterY;

  return xDeviation < tolerance && yDeviation < tolerance;
}
