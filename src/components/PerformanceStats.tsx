import { useEffect, useState, useRef } from 'react';
import type { HandData } from '../hooks/useHandTracking';

interface PerformanceStatsProps {
  hands: HandData[];
  isTracking: boolean;
}

const FPS_WINDOW = 1000;
const FPS_LEVELS = {
  good: 25,
  ok: 15,
};

const CONF_LEVELS = {
  good: 0.7,
  ok: 0.5,
};

export default function PerformanceStats({ hands, isTracking }: PerformanceStatsProps) {
  const [fps, setFps] = useState(0);
  const [avgConf, setAvgConf] = useState(0);
  const frames = useRef<number[]>([]);

  useEffect(() => {
    if (!isTracking) return;
    
    let rafId: number;
    const tick = () => {
      const now = performance.now();
      frames.current.push(now);
      frames.current = frames.current.filter(t => now - t < FPS_WINDOW);
      setFps(frames.current.length);
      rafId = requestAnimationFrame(tick);
    };
    
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isTracking]);

  useEffect(() => {
    if (hands.length > 0) {
      const total = hands.reduce((sum, hand) => sum + hand.score, 0);
      setAvgConf(total / hands.length);
    } else {
      setAvgConf(0);
    }
  }, [hands]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'monospace',
        width: '220px',
        zIndex: 10000,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 'bold', color: '#00ff88' }}>
        Performance Stats
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>FPS:</span>
          <span style={{ color: fps > FPS_LEVELS.good ? '#00ff88' : fps > FPS_LEVELS.ok ? '#ffaa00' : '#ff4444' }}>
            {fps}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Tracking:</span>
          <span style={{ color: isTracking ? '#00ff88' : '#ff4444' }}>
            {isTracking ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Hands:</span>
          <span style={{ color: hands.length > 0 ? '#00ff88' : '#888' }}>
            {hands.length}
          </span>
        </div>
        
        {hands.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Confidence:</span>
              <span style={{ color: avgConf > CONF_LEVELS.good ? '#00ff88' : avgConf > CONF_LEVELS.ok ? '#ffaa00' : '#ff4444' }}>
                {(avgConf * 100).toFixed(1)}%
              </span>
            </div>
            
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {hands.map((hand, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                  <span style={{ color: hand.handedness === 'Right' ? '#4ecdc4' : '#ff6b6b' }}>
                    {hand.handedness}
                  </span>
                  {' '}hand: {(hand.score * 100).toFixed(1)}%
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
