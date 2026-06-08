import React from 'react';

interface MonitorFrameProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function MonitorFrame({
  children,
  orientation = 'horizontal',
  className = '',
}: MonitorFrameProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: isVertical ? '100vh' : '100vw',
        height: isVertical ? '100vw' : '100vh',
        transform: isVertical ? 'rotate(-90deg) translateY(-100vh)' : 'none',
        transformOrigin: isVertical ? '0 0' : 'center',
      }}
    >
      {/* Monitor Bezel/Frame */}
      <div className="relative w-full h-full bg-black rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-900">
        {/* Screen */}
        <div className="relative w-full h-full bg-gray-800">
          {children}
        </div>

        {/* Camera indicator (top center) */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50 w-3 h-3 bg-gray-700 rounded-full border border-gray-600 shadow-lg" />

        {/* Bezel bottom (stand area) */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-900 to-black rounded-b-2xl" />
      </div>

      {/* Stand */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-gray-800 to-gray-900 rounded-b-2xl"
        style={{
          width: '60%',
          height: '20px',
          top: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}
      />
    </div>
  );
}

// Alternative: Simple fullscreen without monitor frame
export function FullscreenDisplay({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-screen h-screen overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
