import { useEffect, useRef, useState, useCallback } from 'react';
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
  maxHands?: number;
}

// Pre-allocate arrays for better performance
const LANDMARK_COUNT = 21;

export default function useHandTracking({ 
  videoElement, 
  targetFPS = 60,
  maxHands = 2
}: UseHandTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [hands, setHands] = useState<HandData[]>([]);
  const [fps, setFps] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdate = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const prevHandsRef = useRef<HandData[]>([]);
  const detectionCacheRef = useRef<Map<number, HandData>>(new Map());

  // Optimized FPS calculation
  const updateFps = useCallback((currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime - lastFpsUpdate.current >= 500) { // Update every 500ms
      const currentFps = Math.round((frameCountRef.current * 1000) / (currentTime - lastFpsUpdate.current) * 2);
      setFps(Math.min(currentFps, 60)); // Cap at 60
      frameCountRef.current = 0;
      lastFpsUpdate.current = currentTime;
    }
  }, []);

  // Frame rate controller
  const shouldProcessFrame = useCallback((currentTime: number): boolean => {
    const frameInterval = 1000 / targetFPS;
    return currentTime - lastUpdate.current >= frameInterval;
  }, [targetFPS]);

  // Initialize hand landmarker
  const initializeDetector = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
          delegate: 'GPU',
        },
        numHands: maxHands,
        runningMode: 'VIDEO',
        minHandDetectionConfidence: 0.6, // Lower for faster detection
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      handLandmarkerRef.current = handLandmarker;
      setIsTracking(true);
      lastFpsUpdate.current = performance.now();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize hand detector:', error);
      setIsTracking(false);
      return false;
    }
  }, [maxHands]);

  // Process detected hands with caching
  const processHandResults = useCallback((results: any): HandData[] => {
    if (!results.landmarks || !results.handedness) {
      return [];
    }

    const detectedHands: HandData[] = [];
    let totalConfidence = 0;
    let handCount = 0;

    // Process hands (max 2)
    const handsToProcess = Math.min(results.landmarks.length, maxHands);
    
    for (let i = 0; i < handsToProcess; i++) {
      const handLandmarks = results.landmarks[i];
      const handedness = results.handedness[i]?.[0]?.categoryName as 'Left' | 'Right';
      const score = results.handedness[i]?.[0]?.score || 0;
      
      if (score >= 0.5 && handLandmarks && handLandmarks.length === LANDMARK_COUNT) {
        const landmarks: HandLandmark[] = new Array(LANDMARK_COUNT);
        
        // Fast landmark processing
        for (let j = 0; j < LANDMARK_COUNT; j++) {
          const lm = handLandmarks[j];
          landmarks[j] = { x: lm.x, y: lm.y, z: lm.z };
        }
        
        detectedHands.push({
          landmarks,
          handedness,
          score,
        });
        
        totalConfidence += score;
        handCount++;
      }
    }

    // Update average confidence
    if (handCount > 0) {
      setConfidence(parseFloat((totalConfidence / handCount * 100).toFixed(1)));
    }

    return detectedHands;
  }, [maxHands]);

  // Main detection loop
  const detectHands = useCallback(async () => {
    if (!handLandmarkerRef.current || !videoElement) return;

    const currentTime = performance.now();
    updateFps(currentTime);

    // Skip if shouldn't process this frame
    if (!shouldProcessFrame(currentTime)) {
      animationRef.current = requestAnimationFrame(detectHands);
      return;
    }

    // Skip if video not ready
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(detectHands);
      return;
    }

    // Prevent concurrent processing
    if (isProcessingRef.current) {
      animationRef.current = requestAnimationFrame(detectHands);
      return;
    }

    isProcessingRef.current = true;
    lastUpdate.current = currentTime;

    try {
      const results = handLandmarkerRef.current.detectForVideo(videoElement, currentTime);
      const detectedHands = processHandResults(results);

      // Update state if hands changed
      if (detectedHands.length !== prevHandsRef.current.length || 
          JSON.stringify(detectedHands) !== JSON.stringify(prevHandsRef.current)) {
        setHands(detectedHands);
        prevHandsRef.current = detectedHands;
      }
    } catch (error) {
      console.error('Detection error:', error);
    } finally {
      isProcessingRef.current = false;
      animationRef.current = requestAnimationFrame(detectHands);
    }
  }, [videoElement, updateFps, shouldProcessFrame, processHandResults]);

  useEffect(() => {
    if (!videoElement) return;

    let isActive = true;
    let detectorInitialized = false;

    const setupTracking = async () => {
      if (videoElement.readyState >= 2) {
        detectorInitialized = await initializeDetector();
        if (detectorInitialized && isActive) {
          detectHands();
        }
      } else {
        const onLoaded = async () => {
          if (isActive) {
            detectorInitialized = await initializeDetector();
            if (detectorInitialized && isActive) {
              detectHands();
            }
          }
        };
        videoElement.addEventListener('loadeddata', onLoaded, { once: true });
      }
    };

    setupTracking();

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
  }, [videoElement, initializeDetector, detectHands]);

  return { 
    isTracking, 
    hands, 
    fps, 
    confidence,
    handCount: hands.length 
  };
}
