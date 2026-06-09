import { useEffect, useRef, useState } from 'react';

export interface FaceLandmarks {
  lips: Array<{ x: number; y: number; z: number }>;
  leftEye: Array<{ x: number; y: number; z: number }>;
  rightEye: Array<{ x: number; y: number; z: number }>;
  leftEyebrow: Array<{ x: number; y: number; z: number }>;
  rightEyebrow: Array<{ x: number; y: number; z: number }>;
  nose: Array<{ x: number; y: number; z: number }>;
  face: Array<{ x: number; y: number; z: number }>;
}

export interface FaceBlendshapes {
  mouthOpen: number;
  mouthWide: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  eyeLookLeftLeft: number;
  eyeLookLeftRight: number;
  eyeLookRightLeft: number;
  eyeLookRightRight: number;
  browDownLeft: number;
  browDownRight: number;
  browUpLeft: number;
  browUpRight: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthFrownLeft: number;
  mouthFrownRight: number;
  noseSneerLeft: number;
  noseSneerRight: number;
  jawOpen: number;
  jawLeft: number;
  jawRight: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
}

interface UseMediaPipeFaceDetectionOptions {
  enabled?: boolean;
  onFaceDetected?: (landmarks: FaceLandmarks, blendshapes: FaceBlendshapes) => void;
  onFaceClose?: () => void;
  distanceThreshold?: number;
}

export function useMediaPipeFaceDetection(options: UseMediaPipeFaceDetectionOptions = {}) {
  const {
    enabled = true,
    onFaceDetected,
    onFaceClose,
    distanceThreshold = 0.15,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCloseTimeRef = useRef<number>(0);

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const initializeMediaPipe = async () => {
      try {
        // Load MediaPipe Face Landmarker
        const { FaceLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        );

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (isMounted) {
          faceLandmarkerRef.current = faceLandmarker;
        }

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

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

        if (!canvasRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          canvasRef.current = canvas;
        }

        if (isMounted) {
          setIsInitialized(true);
          setError(null);
          detectFaces();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize MediaPipe';
        if (isMounted) {
          setError(message);
        }
        console.error('MediaPipe initialization error:', err);
      }
    };

    initializeMediaPipe();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [enabled]);

  const detectFaces = () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarkerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const detect = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          const results = faceLandmarkerRef.current.detectForVideo(video, Date.now());

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            const blendshapes = results.faceBlendshapes?.[0]?.categories || [];

            // Extract specific landmark groups
            const faceLandmarksData: FaceLandmarks = {
              lips: landmarks.slice(61, 80),
              leftEye: landmarks.slice(33, 41),
              rightEye: landmarks.slice(362, 370),
              leftEyebrow: landmarks.slice(46, 53),
              rightEyebrow: landmarks.slice(276, 283),
              nose: landmarks.slice(1, 31),
              face: landmarks,
            };

            // Convert blendshapes to object
            const blendshapesData: FaceBlendshapes = {
              mouthOpen: blendshapes.find((b: any) => b.categoryName === 'mouthOpen')?.score || 0,
              mouthWide: blendshapes.find((b: any) => b.categoryName === 'mouthWide')?.score || 0,
              eyeBlinkLeft: blendshapes.find((b: any) => b.categoryName === 'eyeBlinkLeft')?.score || 0,
              eyeBlinkRight: blendshapes.find((b: any) => b.categoryName === 'eyeBlinkRight')?.score || 0,
              eyeLookUpLeft: blendshapes.find((b: any) => b.categoryName === 'eyeLookUpLeft')?.score || 0,
              eyeLookUpRight: blendshapes.find((b: any) => b.categoryName === 'eyeLookUpRight')?.score || 0,
              eyeLookDownLeft: blendshapes.find((b: any) => b.categoryName === 'eyeLookDownLeft')?.score || 0,
              eyeLookDownRight: blendshapes.find((b: any) => b.categoryName === 'eyeLookDownRight')?.score || 0,
              eyeLookLeftLeft: blendshapes.find((b: any) => b.categoryName === 'eyeLookLeftLeft')?.score || 0,
              eyeLookLeftRight: blendshapes.find((b: any) => b.categoryName === 'eyeLookLeftRight')?.score || 0,
              eyeLookRightLeft: blendshapes.find((b: any) => b.categoryName === 'eyeLookRightLeft')?.score || 0,
              eyeLookRightRight: blendshapes.find((b: any) => b.categoryName === 'eyeLookRightRight')?.score || 0,
              browDownLeft: blendshapes.find((b: any) => b.categoryName === 'browDownLeft')?.score || 0,
              browDownRight: blendshapes.find((b: any) => b.categoryName === 'browDownRight')?.score || 0,
              browUpLeft: blendshapes.find((b: any) => b.categoryName === 'browUpLeft')?.score || 0,
              browUpRight: blendshapes.find((b: any) => b.categoryName === 'browUpRight')?.score || 0,
              cheekSquintLeft: blendshapes.find((b: any) => b.categoryName === 'cheekSquintLeft')?.score || 0,
              cheekSquintRight: blendshapes.find((b: any) => b.categoryName === 'cheekSquintRight')?.score || 0,
              mouthSmileLeft: blendshapes.find((b: any) => b.categoryName === 'mouthSmileLeft')?.score || 0,
              mouthSmileRight: blendshapes.find((b: any) => b.categoryName === 'mouthSmileRight')?.score || 0,
              mouthFrownLeft: blendshapes.find((b: any) => b.categoryName === 'mouthFrownLeft')?.score || 0,
              mouthFrownRight: blendshapes.find((b: any) => b.categoryName === 'mouthFrownRight')?.score || 0,
              noseSneerLeft: blendshapes.find((b: any) => b.categoryName === 'noseSneerLeft')?.score || 0,
              noseSneerRight: blendshapes.find((b: any) => b.categoryName === 'noseSneerRight')?.score || 0,
              jawOpen: blendshapes.find((b: any) => b.categoryName === 'jawOpen')?.score || 0,
              jawLeft: blendshapes.find((b: any) => b.categoryName === 'jawLeft')?.score || 0,
              jawRight: blendshapes.find((b: any) => b.categoryName === 'jawRight')?.score || 0,
              headYaw: blendshapes.find((b: any) => b.categoryName === 'headYaw')?.score || 0,
              headPitch: blendshapes.find((b: any) => b.categoryName === 'headPitch')?.score || 0,
              headRoll: blendshapes.find((b: any) => b.categoryName === 'headRoll')?.score || 0,
            };

            onFaceDetected?.(faceLandmarksData, blendshapesData);

            // Check if face is close (based on face size)
            const faceWidth = Math.abs(landmarks[454].x - landmarks[234].x);
            const distance = Math.max(0, Math.min(1, 0.3 / faceWidth));

            if (distance < distanceThreshold) {
              const now = Date.now();
              if (now - lastCloseTimeRef.current > 1000) {
                onFaceClose?.();
                lastCloseTimeRef.current = now;
              }
            }
          }
        } catch (err) {
          console.error('Face detection error:', err);
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
