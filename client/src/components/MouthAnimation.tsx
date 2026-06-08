import React from 'react';

interface MouthShape {
  openness: number;
  roundness: number;
  width: number;
}

interface MouthAnimationProps {
  shape: MouthShape;
  isActive: boolean;
  className?: string;
}

export function MouthAnimation({
  shape,
  isActive,
  className = '',
}: MouthAnimationProps) {
  if (!isActive) {
    return null;
  }

  // Calculate mouth dimensions based on shape
  const mouthWidth = 60 * shape.width;
  const mouthHeight = 40 * shape.openness;
  const borderRadius = shape.roundness * 50;

  // Create animated mouth using SVG
  return (
    <svg
      className={`absolute pointer-events-none transition-all duration-75 ${className}`}
      width={mouthWidth}
      height={mouthHeight}
      viewBox={`0 0 ${mouthWidth} ${mouthHeight}`}
      style={{
        opacity: isActive ? 1 : 0,
        transform: `scale(${0.8 + shape.width * 0.4})`,
      }}
    >
      {/* Mouth shape - ellipse that changes based on phoneme */}
      <ellipse
        cx={mouthWidth / 2}
        cy={mouthHeight / 2}
        rx={mouthWidth / 2}
        ry={mouthHeight / 2}
        fill="rgba(200, 100, 80, 0.8)"
        style={{
          borderRadius: `${borderRadius}%`,
        }}
      />

      {/* Inner mouth shadow for depth */}
      <ellipse
        cx={mouthWidth / 2}
        cy={mouthHeight / 2 + 2}
        rx={mouthWidth / 2 - 4}
        ry={mouthHeight / 2 - 4}
        fill="rgba(160, 70, 50, 0.6)"
        opacity={shape.openness * 0.5}
      />

      {/* Mouth outline */}
      <ellipse
        cx={mouthWidth / 2}
        cy={mouthHeight / 2}
        rx={mouthWidth / 2}
        ry={mouthHeight / 2}
        fill="none"
        stroke="rgba(140, 60, 40, 0.4)"
        strokeWidth="1"
      />
    </svg>
  );
}

// Enhanced CSS-based mouth animation with better visuals
export function SimpleMouthAnimation({
  shape,
  isActive,
  className = '',
}: MouthAnimationProps) {
  if (!isActive) {
    return null;
  }

  const mouthWidth = 60 * shape.width;
  const mouthHeight = 40 * shape.openness;
  const lipThickness = 2 + shape.openness * 2;

  return (
    <div className={`absolute pointer-events-none ${className}`}>
      {/* Main mouth shape */}
      <div
        className="absolute transition-all duration-75"
        style={{
          width: `${mouthWidth}px`,
          height: `${mouthHeight}px`,
          background: `radial-gradient(ellipse at center, rgba(220, 120, 100, 0.95), rgba(180, 80, 60, 0.7))`,
          borderRadius: `${shape.roundness * 50}%`,
          opacity: isActive ? 1 : 0,
          transform: `scale(${0.8 + shape.width * 0.4})`,
          boxShadow: `
            inset 0 2px 6px rgba(0, 0, 0, 0.4),
            inset 0 -1px 3px rgba(255, 255, 255, 0.1),
            0 2px 4px rgba(0, 0, 0, 0.3)
          `,
        }}
      />

      {/* Upper lip highlight */}
      {shape.openness > 0.1 && (
        <div
          className="absolute transition-all duration-75"
          style={{
            width: `${mouthWidth * 0.9}px`,
            height: `${lipThickness}px`,
            background: `linear-gradient(to bottom, rgba(255, 200, 180, 0.4), transparent)`,
            borderRadius: '50%',
            top: `-${lipThickness}px`,
            left: `${mouthWidth * 0.05}px`,
            opacity: isActive ? 0.6 : 0,
          }}
        />
      )}

      {/* Lower lip shadow */}
      {shape.openness > 0.1 && (
        <div
          className="absolute transition-all duration-75"
          style={{
            width: `${mouthWidth * 0.9}px`,
            height: `${lipThickness}px`,
            background: `linear-gradient(to top, rgba(0, 0, 0, 0.2), transparent)`,
            borderRadius: '50%',
            bottom: `-${lipThickness}px`,
            left: `${mouthWidth * 0.05}px`,
            opacity: isActive ? 0.4 : 0,
          }}
        />
      )}
    </div>
  );
}
