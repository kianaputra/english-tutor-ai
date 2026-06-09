import React from 'react';
import { FaceBlendshapes } from '@/hooks/useMediaPipeFaceDetection';

interface FaceAnimationOverlayProps {
  blendshapes: FaceBlendshapes;
  isActive: boolean;
  className?: string;
}

/**
 * Displays face animation effects based on MediaPipe blendshapes
 * This component overlays visual effects on top of the teacher image
 */
export function FaceAnimationOverlay({
  blendshapes,
  isActive,
  className = '',
}: FaceAnimationOverlayProps) {
  if (!isActive) {
    return null;
  }

  // Calculate eye blink animation
  const eyeBlinkIntensity = Math.max(blendshapes.eyeBlinkLeft, blendshapes.eyeBlinkRight);

  // Calculate mouth openness
  const mouthOpenness = blendshapes.mouthOpen;
  const jawOpenness = blendshapes.jawOpen;

  // Calculate smile intensity
  const smileIntensity = Math.max(blendshapes.mouthSmileLeft, blendshapes.mouthSmileRight);

  // Calculate eyebrow position
  const browUpIntensity = Math.max(blendshapes.browUpLeft, blendshapes.browUpRight);
  const browDownIntensity = Math.max(blendshapes.browDownLeft, blendshapes.browDownRight);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Eye blink effect */}
      {eyeBlinkIntensity > 0.3 && (
        <div
          className="absolute top-0 left-0 right-0 bottom-0 bg-black transition-opacity duration-75"
          style={{
            opacity: eyeBlinkIntensity * 0.5,
          }}
        />
      )}

      {/* Mouth glow effect when speaking */}
      {mouthOpenness > 0.2 && (
        <div
          className="absolute bottom-2/5 left-1/2 transform -translate-x-1/2"
          style={{
            width: '120px',
            height: '80px',
            background: `radial-gradient(ellipse at center, rgba(255, 150, 100, ${mouthOpenness * 0.3}), transparent)`,
            borderRadius: '50%',
            filter: 'blur(20px)',
            opacity: mouthOpenness,
          }}
        />
      )}

      {/* Smile effect - subtle brightness increase */}
      {smileIntensity > 0.3 && (
        <div
          className="absolute inset-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255, 200, 150, ${smileIntensity * 0.1}), transparent)`,
            opacity: smileIntensity,
          }}
        />
      )}

      {/* Eyebrow raise effect */}
      {browUpIntensity > 0.3 && (
        <div
          className="absolute top-1/4 left-0 right-0"
          style={{
            height: '40px',
            background: `linear-gradient(to bottom, rgba(255, 255, 255, ${browUpIntensity * 0.1}), transparent)`,
            opacity: browUpIntensity,
          }}
        />
      )}

      {/* Head tilt visualization */}
      {Math.abs(blendshapes.headYaw) > 0.1 && (
        <div
          className="absolute inset-0 transition-all duration-100"
          style={{
            transform: `skewX(${blendshapes.headYaw * 5}deg)`,
            opacity: 0.05,
          }}
        />
      )}
    </div>
  );
}

/**
 * Display blendshapes debug info (for development)
 */
export function BlendshapesDebug({
  blendshapes,
  visible = false,
}: {
  blendshapes: FaceBlendshapes;
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="absolute top-4 left-4 z-50 bg-black/80 text-white text-xs p-3 rounded-lg max-w-xs max-h-96 overflow-y-auto font-mono">
      <div className="font-bold mb-2">MediaPipe Blendshapes</div>
      <div className="space-y-1">
        <div>Mouth Open: {(blendshapes.mouthOpen * 100).toFixed(0)}%</div>
        <div>Mouth Wide: {(blendshapes.mouthWide * 100).toFixed(0)}%</div>
        <div>Jaw Open: {(blendshapes.jawOpen * 100).toFixed(0)}%</div>
        <div>Eye Blink L: {(blendshapes.eyeBlinkLeft * 100).toFixed(0)}%</div>
        <div>Eye Blink R: {(blendshapes.eyeBlinkRight * 100).toFixed(0)}%</div>
        <div>Smile L: {(blendshapes.mouthSmileLeft * 100).toFixed(0)}%</div>
        <div>Smile R: {(blendshapes.mouthSmileRight * 100).toFixed(0)}%</div>
        <div>Brow Up L: {(blendshapes.browUpLeft * 100).toFixed(0)}%</div>
        <div>Brow Up R: {(blendshapes.browUpRight * 100).toFixed(0)}%</div>
        <div>Head Yaw: {(blendshapes.headYaw * 100).toFixed(0)}%</div>
        <div>Head Pitch: {(blendshapes.headPitch * 100).toFixed(0)}%</div>
        <div>Head Roll: {(blendshapes.headRoll * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
}
