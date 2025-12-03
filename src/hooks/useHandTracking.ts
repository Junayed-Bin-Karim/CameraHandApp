import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HandLandmark {
  x: number;
  y: number;
  z?: number;
  name?: string;
}

export interface HandData {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  score: number;
}

interface UseHandTrackingProps {
  videoElement: HTMLVideoElement | null;
}

export default function useHandTracking({ videoElement }: UseHandTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [hands, setHands] = useState<HandData[]>([]);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    if (!videoElement) return;

    let isActive = true;

    const initializeDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          numHands: 2,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.8,
          minHandPresenceConfidence: 0.8,
          minTrackingConfidence: 0.8,
        });

        handLandmarkerRef.current = handLandmarker;
        setIsTracking(true);

        detectHands();
      } catch (error) {
        console.error('Failed to initialize hand detector:', error);
        setIsTracking(false);
      }
    };

    const detectHands = async () => {
      if (!isActive || !handLandmarkerRef.current || !videoElement) return;

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        if (isActive) {
          animationRef.current = requestAnimationFrame(detectHands);
        }
        return;
      }

      const startTimeMs = performance.now();
      const results = handLandmarkerRef.current.detectForVideo(videoElement, startTimeMs);
      const detectedHands: HandData[] = [];

      if (results.landmarks && results.handedness) {
        results.landmarks.forEach((handLandmarks: NormalizedLandmark[], index: number) => {
          const handedness = results.handedness[index]?.[0]?.categoryName as 'Left' | 'Right';
          const score = results.handedness[index]?.[0]?.score || 0;
          if (score >= 0.8) {
            detectedHands.push({
              landmarks: handLandmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z })),
              handedness,
              score,
            });
          }
        });
      }

      const now = performance.now();
      if (now - lastUpdate.current > 16) {
        setHands(detectedHands);
        lastUpdate.current = now;
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(detectHands);
      }
    };

    if (videoElement.readyState >= 2) {
      initializeDetector();
    } else {
      videoElement.addEventListener('loadeddata', initializeDetector, { once: true });
    }

    return () => {
      isActive = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
      setIsTracking(false);
    };
  }, [videoElement]);

  return { isTracking, hands };
}
