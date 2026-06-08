import { useEffect, useRef, useState } from 'react';

interface FaceDetectionResult {
  hasFace: boolean;
  distance: number; // 0-1, where 1 is closest
  confidence: number;
  faceWidth: number;
  faceHeight: number;
}

interface UseFaceDetectionOptions {
  enabled?: boolean;
  onFaceDetected?: (result: FaceDetectionResult) => void;
  onFaceClose?: () => void; // Called when face is within 2 meters
  distanceThreshold?: number; // 0-1, default 0.15 (close distance)
}

export function useFaceDetection(options: UseFaceDetectionOptions = {}) {
  const {
    enabled = true,
    onFaceDetected,
    onFaceClose,
    distanceThreshold = 0.15,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCloseTimeRef = useRef<number>(0);

  // Initialize camera and face detection
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const initializeCamera = async () => {
      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 240 },
          },
        });

        // Create video element
        if (!videoRef.current) {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.style.display = 'none';
          document.body.appendChild(video);
          videoRef.current = video;
        } else {
          videoRef.current.srcObject = stream;
        }

        // Create canvas for frame capture
        if (!canvasRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          canvasRef.current = canvas;
        }

        if (isMounted) {
          setIsInitialized(true);
          setError(null);
          // Start detection loop
          detectFaces();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access camera';
        if (isMounted) {
          setError(message);
        }
        console.error('Camera initialization error:', err);
      }
    };

    initializeCamera();

    return () => {
      isMounted = false;
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [enabled]);

  // Simple motion-based face detection (fallback if MediaPipe not available)
  const detectFaces = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const detect = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Simple face detection: look for skin-tone colors and face-like patterns
        // This is a simplified approach - in production, use MediaPipe
        let skinPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Simple skin tone detection (rough approximation)
          if (
            r > 95 &&
            g > 40 &&
            b > 20 &&
            r > g &&
            r > b &&
            Math.abs(r - g) > 15
          ) {
            skinPixels++;
          }
        }

        const skinRatio = skinPixels / (canvas.width * canvas.height);
        const hasFace = skinRatio > 0.15; // Threshold for face detection

        // Estimate distance based on face size
        // Larger face = closer distance
        const faceSize = skinRatio;
        const distance = Math.max(0, Math.min(1, 1 - faceSize * 3));
        const confidence = Math.min(1, skinRatio * 2);

        const result: FaceDetectionResult = {
          hasFace,
          distance,
          confidence,
          faceWidth: canvas.width * Math.sqrt(skinRatio),
          faceHeight: canvas.height * Math.sqrt(skinRatio),
        };

        onFaceDetected?.(result);

        // Trigger onFaceClose if face is within threshold
        if (distance < distanceThreshold) {
          const now = Date.now();
          if (now - lastCloseTimeRef.current > 1000) {
            // Debounce: only trigger once per second
            onFaceClose?.();
            lastCloseTimeRef.current = now;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  return {
    isInitialized,
    error,
    videoRef,
  };
}
