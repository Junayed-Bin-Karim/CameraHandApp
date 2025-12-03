import { useEffect, useRef } from 'react';
import type { HandData } from '../hooks/useHandTracking';

interface HandOverlayProps {
  hands: HandData[];
  videoWidth: number;
  videoHeight: number;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17], // Palm
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
const WRIST_INDEX = 0;

const COLORS = {
  rightHand: '#00ff00',
  leftHand: '#ff00ff',
  fingertip: '#ffff00',
  label: 'white',
  labelOutline: 'black',
};

const DRAWING_PARAMS = {
  connectionWidth: 2,
  fingertipRadius: 6,
  jointRadius: 4,
  labelFont: 'bold 16px sans-serif',
  labelOutlineWidth: 3,
  labelOffset: 10,
};

export default function HandOverlay({ hands, videoWidth, videoHeight }: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    hands.forEach((hand) => {
      const { landmarks, handedness } = hand;
      const handColor = handedness === 'Right' ? COLORS.rightHand : COLORS.leftHand;

      // Draw hand skeleton
      ctx.strokeStyle = handColor;
      ctx.lineWidth = DRAWING_PARAMS.connectionWidth;

      HAND_CONNECTIONS.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];

        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      });

      // Draw landmarks
      landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        const isFingertip = FINGERTIP_INDICES.includes(index);

        ctx.fillStyle = isFingertip ? COLORS.fingertip : handColor;
        ctx.beginPath();
        ctx.arc(x, y, isFingertip ? DRAWING_PARAMS.fingertipRadius : DRAWING_PARAMS.jointRadius, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Handedness label
      const wrist = landmarks[WRIST_INDEX];
      const labelX = wrist.x * canvas.width;
      const labelY = wrist.y * canvas.height - DRAWING_PARAMS.labelOffset;

      ctx.font = DRAWING_PARAMS.labelFont;
      ctx.lineWidth = DRAWING_PARAMS.labelOutlineWidth;
      ctx.strokeStyle = COLORS.labelOutline;
      ctx.strokeText(handedness, labelX, labelY);
      ctx.fillStyle = COLORS.label;
      ctx.fillText(handedness, labelX, labelY);
    });
  }, [hands, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth}
      height={videoHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transform: 'scaleX(-1)',
      }}
    />
  );
}
