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
  targetFPS?: number;
}

export default function useHandTracking({ 
  videoElement, 
  targetFPS = 60 
}: UseHandTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [hands, setHands] = useState<HandData[]>([]);
  const [fps, setFps] = useState<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdate = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const frameQueueRef = useRef<number[]>([]);

  // FPS calculation
  const updateFps = (currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime - lastFpsUpdate.current >= 1000) {
      const currentFps = Math.round((frameCountRef.current * 1000) / (currentTime - lastFpsUpdate.current));
      setFps(currentFps);
      frameCountRef.current = 0;
      lastFpsUpdate.current = currentTime;
    }
  };

  // Throttle detection to target FPS
  const shouldProcessFrame = (currentTime: number): boolean => {
    const frameInterval = 1000 / targetFPS;
    return currentTime - lastUpdate.current >= frameInterval;
  };

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
            delegate: 'GPU', // Keep GPU for best performance
          },
          numHands: 2,
          runningMode: 'VIDEO',
          // Slightly adjusted confidence thresholds for speed
          minHandDetectionConfidence: 0.7,
          minHandPresenceConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        handLandmarkerRef.current = handLandmarker;
        setIsTracking(true);
        lastFpsUpdate.current = performance.now();
        
        detectHands();
      } catch (error) {
        console.error('Failed to initialize hand detector:', error);
        setIsTracking(false);
      }
    };

    const detectHands = async () => {
      if (!isActive || !handLandmarkerRef.current || !videoElement) return;

      const currentTime = performance.now();
      updateFps(currentTime);

      // Skip frame if we're already processing or shouldn't process this frame
      if (isProcessingRef.current || !shouldProcessFrame(currentTime)) {
        animationRef.current = requestAnimationFrame(detectHands);
        return;
      }

      // Skip if video not ready
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        animationRef.current = requestAnimationFrame(detectHands);
        return;
      }

      isProcessingRef.current = true;
      lastUpdate.current = currentTime;

      try {
        const results = handLandmarkerRef.current.detectForVideo(
          videoElement, 
          currentTime
        );
        
        const detectedHands: HandData[] = [];

        if (results.landmarks && results.handedness) {
          // Process only first 2 hands to save time
          const maxHands = Math.min(results.landmarks.length, 2);
          
          for (let i = 0; i < maxHands; i++) {
            const handLandmarks = results.landmarks[i];
            const handedness = results.handedness[i]?.[0]?.categoryName as 'Left' | 'Right';
            const score = results.handedness[i]?.[0]?.score || 0;
            
            if (score >= 0.7 && handLandmarks) {
              // Convert landmarks once instead of mapping twice
              const landmarks: HandLandmark[] = new Array(handLandmarks.length);
              for (let j = 0; j < handLandmarks.length; j++) {
                const lm = handLandmarks[j];
                landmarks[j] = { x: lm.x, y: lm.y, z: lm.z };
              }
              
              detectedHands.push({
                landmarks,
                handedness,
                score,
              });
            }
          }
        }

        // Use requestAnimationFrame callback for smooth UI updates
        requestAnimationFrame(() => {
          setHands(detectedHands);
        });
        
      } catch (error) {
        console.error('Detection error:', error);
      } finally {
        isProcessingRef.current = false;
        if (isActive) {
          animationRef.current = requestAnimationFrame(detectHands);
        }
      }
    };

    // Use a smaller, optimized video resolution for processing
    const setupVideoForTracking = () => {
      if (videoElement.readyState >= 2) {
        initializeDetector();
      } else {
        videoElement.addEventListener('loadeddata', initializeDetector, { once: true });
      }
    };

    setupVideoForTracking();

    return () => {
      isActive = false;
      isProcessingRef.current = false;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
      
      setIsTracking(false);
    };
  }, [videoElement, targetFPS]);

  return { isTracking, hands, fps };
}
