import type { HandData } from '../hooks/useHandTracking';

export interface GestureState {
  isPinching: boolean;
  pinchStrength: number;
  isFist: boolean;
}

const PINCH_DIST = 0.08;
const Z_WEIGHT = 1.35;
const CURL_RATIO = 1.3;
const MIN_CURLED = 3;

// landmark indices
const LM: any = {
  wrist: 0,
  thumbTip: 4,
  indexTip: 8,
  middleTip: 12,
  ringTip: 16,
  pinkyTip: 20,
  indexMCP: 5,
  middleMCP: 9,
  ringMCP: 13,
  pinkyMCP: 17,
};

export function detectPinchGesture(hand: HandData): GestureState {
  const thumbTip = hand.landmarks[LM.thumbTip];
  const indexTip = hand.landmarks[LM.indexTip];

  // 3D distance between thumb and index finger
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const dz = ((thumbTip.z || 0) - (indexTip.z || 0)) * Z_WEIGHT;
  
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const pinchStrength = Math.max(0, Math.min(1, 1 - (distance / PINCH_DIST)));
  const isPinching = distance < PINCH_DIST;

  // Fist detection
  const wrist = hand.landmarks[LM.wrist];
  const fingerTips = [
    hand.landmarks[LM.indexTip],
    hand.landmarks[LM.middleTip],
    hand.landmarks[LM.ringTip],
    hand.landmarks[LM.pinkyTip],
  ];
  
  const fingerMCPs = [
    hand.landmarks[LM.indexMCP],
    hand.landmarks[LM.middleMCP],
    hand.landmarks[LM.ringMCP],
    hand.landmarks[LM.pinkyMCP],
  ];

  let isFist = false;
  let curledCount = 0;
  
  // Compare fingertip-to-wrist vs knuckle-to-wrist distances
  // If fingertip is closer to wrist than expected, finger is curled
  //Also, I made it so fist overrides pinch because they conflict often in testing
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = fingerTips[i];
    const mcp = fingerMCPs[i];
    
    const tipToWristDist = Math.sqrt(
      Math.pow(tip.x - wrist.x, 2) + 
      Math.pow(tip.y - wrist.y, 2) + 
      Math.pow((tip.z || 0) - (wrist.z || 0), 2)
    );
    
    const mcpToWristDist = Math.sqrt(
      Math.pow(mcp.x - wrist.x, 2) + 
      Math.pow(mcp.y - wrist.y, 2) + 
      Math.pow((mcp.z || 0) - (wrist.z || 0), 2)
    );
    
    const extensionRatio = tipToWristDist / mcpToWristDist;
    
    if (extensionRatio < CURL_RATIO) {
      curledCount++;
    }
  }
  
  isFist = curledCount >= MIN_CURLED;

  return {
    isPinching,
    pinchStrength,
    isFist,
  };
}
