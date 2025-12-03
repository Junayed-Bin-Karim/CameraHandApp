import { useEffect, useState, useRef } from 'react';
import type { HandData } from '../hooks/useHandTracking';
import { detectPinchGesture } from '../utils/gestureDetection';

const SMOOTHING = 0.3;
const BUFFER_SIZE = 3;
const FINGER_TIP = 8;
const COOLDOWN = 150;

const CURSOR_SIZES: Record<string, number> = {
  normal: 24,
  pinch: 32,
  fist: 40,
};

const INNER_DOT_SIZES: Record<string, number> = {
  normal: 8,
  pinch: 12,
  fist: 16,
};

interface VirtualCursorProps {
  hands: HandData[];
  onPosChange?: (pos: { x: number; y: number }, visible: boolean) => void;
  onPinch?: (val: boolean) => void;
  onFist?: (val: boolean) => void;
}

export default function VirtualCursor({ hands, onPosChange, onPinch, onFist }: VirtualCursorProps) {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isFist, setIsFist] = useState(false);
  const buffer = useRef<{ x: number; y: number }[]>([]);
  const lastSeen = useRef<number>(0);
  const gesturesOn = useRef<boolean>(true);

  useEffect(() => {
    if (hands.length === 0) {
      const now = performance.now();
      const elapsed = now - lastSeen.current;
      
      if (lastSeen.current > 0 && elapsed < COOLDOWN) {
        gesturesOn.current = false;
        setTimeout(() => {
          gesturesOn.current = true;
        }, COOLDOWN);
      }
      
      setIsVisible(false);
      setIsPinching(false);
      setIsFist(false);
      buffer.current = [];
      onPosChange?.({ x: 0, y: 0 }, false);
      onPinch?.(false);
      onFist?.(false);
      return;
    }

    lastSeen.current = performance.now();
    const hand = hands[0];
    const tip = hand.landmarks[FINGER_TIP];

    const rawX = (1 - tip.x) * window.innerWidth;
    const rawY = tip.y * window.innerHeight;

    buffer.current.push({ x: rawX, y: rawY });
    if (buffer.current.length > BUFFER_SIZE) {
      buffer.current.shift();
    }

    const avgX = buffer.current.reduce((sum, p) => sum + p.x, 0) / buffer.current.length;
    const avgY = buffer.current.reduce((sum, p) => sum + p.y, 0) / buffer.current.length;

    const smoothX = cursorPos.x + (avgX - cursorPos.x) * SMOOTHING;
    const smoothY = cursorPos.y + (avgY - cursorPos.y) * SMOOTHING;

    setCursorPos({ x: smoothX, y: smoothY });
    setIsVisible(true);
    onPosChange?.({ x: smoothX, y: smoothY }, true);

    if (gesturesOn.current) {
      const gesture = detectPinchGesture(hand);
      setIsPinching(gesture.isPinching);
      setIsFist(gesture.isFist);
      onPinch?.(gesture.isPinching);
      onFist?.(gesture.isFist);
    } else {
      setIsPinching(false);
      setIsFist(false);
      onPinch?.(false);
      onFist?.(false);
    }
  }, [hands, onPosChange, onPinch, onFist]);

  if (!isVisible) return null;

  const cursorSize = isFist ? CURSOR_SIZES.fist : isPinching ? CURSOR_SIZES.pinch : CURSOR_SIZES.normal;
  const innerDotSize = isFist ? INNER_DOT_SIZES.fist : isPinching ? INNER_DOT_SIZES.pinch : INNER_DOT_SIZES.normal;

  const cursorColor = isFist 
    ? 'rgba(255, 165, 0, 0.8)' 
    : isPinching 
    ? 'rgba(255, 100, 255, 0.8)' 
    : 'rgba(0, 255, 255, 0.7)';

  const borderColor = isFist 
    ? 'rgba(255, 200, 100, 0.9)' 
    : isPinching 
    ? 'rgba(255, 200, 255, 0.9)' 
    : 'rgba(255, 255, 255, 0.9)';

  const glowEffect = isFist
    ? '0 0 30px rgba(255, 165, 0, 1), 0 0 60px rgba(255, 165, 0, 0.5)'
    : isPinching 
    ? '0 0 30px rgba(255, 100, 255, 1), 0 0 60px rgba(255, 100, 255, 0.5)'
    : '0 0 20px rgba(0, 255, 255, 0.8)';

  return (
    <div
      className="virtual-cursor"
      style={{
        position: 'fixed',
        left: `${cursorPos.x}px`,
        top: `${cursorPos.y}px`,
        width: `${cursorSize}px`,
        height: `${cursorSize}px`,
        borderRadius: '50%',
        backgroundColor: cursorColor,
        border: `3px solid ${borderColor}`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 99999,
        boxShadow: glowEffect,
        transition: 'width 0.1s ease-out, height 0.1s ease-out, background-color 0.1s ease-out',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${innerDotSize}px`,
          height: `${innerDotSize}px`,
          borderRadius: '50%',
          backgroundColor: 'white',
        }}
      />
    </div>
  );
}
