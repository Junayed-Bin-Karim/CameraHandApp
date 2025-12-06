import { useEffect, useRef, useState, useCallback, memo } from 'react';
import HandOverlay from './HandOverlay';
import type { HandData } from '../hooks/useHandTracking';

interface CameraViewProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
  hands?: HandData[];
  showOverlay?: boolean;
  fps?: number;
  confidence?: number;
  handCount?: number;
}

// Memoize the overlay to prevent unnecessary re-renders
const MemoizedHandOverlay = memo(HandOverlay);

const CameraView = ({ 
  onVideoReady, 
  hands = [], 
  showOverlay = true,
  fps = 0,
  confidence = 0,
  handCount = 0
}: CameraViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    if (onVideoReady) {
      onVideoReady(video);
    }
  }, [onVideoReady]);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        // Optimized constraints for two-hand tracking
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 640, max: 960 }, // Balanced resolution
            height: { ideal: 480, max: 540 },
            facingMode: 'user',
            frameRate: { ideal: 60, min: 30 },
            // Use optimal device settings
            resizeMode: 'none',
            aspectRatio: 4/3
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Optimize video element
          videoRef.current.playsInline = true;
          videoRef.current.muted = true;
          videoRef.current.preload = 'auto';

          const onCanPlay = () => {
            if (!mounted || !videoRef.current) return;
            
            videoRef.current.play().then(() => {
              if (!mounted) return;
              
              setIsLoading(false);
              setIsCameraReady(true);
              
              const { videoWidth, videoHeight } = videoRef.current!;
              setVideoDimensions({ width: videoWidth, height: videoHeight });
              
              handleVideoReady(videoRef.current!);
              
              // Remove event listeners
              videoRef.current?.removeEventListener('canplay', onCanPlay);
            }).catch(err => {
              console.error('Video play error:', err);
              if (mounted) {
                setIsLoading(false);
                setError('Failed to play video stream');
              }
            });
          };

          videoRef.current.addEventListener('canplay', onCanPlay, { once: true });
          
          // Fallback timeout
          setTimeout(() => {
            if (mounted && isLoading && videoRef.current?.readyState >= 3) {
              onCanPlay();
            }
          }, 3000);
        }
      } catch (err) {
        console.error('Camera access error:', err);
        if (mounted) {
          setError('Failed to access camera. Please ensure camera permissions are granted.');
          setIsLoading(false);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [handleVideoReady, isLoading]);

  // Performance stats component
  const PerformanceStats = useCallback(() => {
    const isGoodFps = fps >= 45;
    const isMediumFps = fps >= 30 && fps < 45;
    
    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: isGoodFps ? '#4ade80' : isMediumFps ? '#fbbf24' : '#f87171',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: "'Courier New', monospace",
        zIndex: 100,
        pointerEvents: 'none',
        border: `2px solid ${isGoodFps ? '#4ade80' : isMediumFps ? '#fbbf24' : '#f87171'}`,
        backdropFilter: 'blur(4px)',
        minWidth: '180px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>FPS:</span>
          <span style={{ fontWeight: 'bold' }}>{fps.toFixed(1)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Tracking:</span>
          <span style={{ 
            fontWeight: 'bold',
            color: hands.length > 0 ? '#4ade80' : '#f87171'
          }}>
            {hands.length > 0 ? 'Active' : 'No Hands'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Hands:</span>
          <span style={{ fontWeight: 'bold' }}>{handCount} / 2</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Confidence:</span>
          <span style={{ fontWeight: 'bold' }}>{confidence.toFixed(1)}%</span>
        </div>
        {hands.map((hand, index) => (
          <div key={index} style={{ 
            fontSize: '11px', 
            marginTop: '4px',
            padding: '2px 4px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '4px'
          }}>
            {hand.handedness} hand: {hand.score ? (hand.score * 100).toFixed(1) + '%' : '--'}
          </div>
        ))}
      </div>
    );
  }, [fps, hands, handCount, confidence]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          color: 'white',
          fontSize: '16px',
          gap: '20px'
        }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #4ade80',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ margin: 0 }}>Initializing camera for hand tracking...</p>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>Ensure both hands are visible</p>
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          color: '#f87171',
          padding: '20px',
          textAlign: 'center',
          fontSize: '16px'
        }}>
          <div>
            <p style={{ marginBottom: '10px' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4ade80',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div style={{ 
        position: 'relative',
        paddingTop: '75%', // 4:3 aspect ratio
        backgroundColor: '#000'
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)',
            objectFit: 'cover',
            display: 'block'
          }}
          onError={() => {
            setError('Video stream error occurred');
            setIsLoading(false);
          }}
        />
        
        {isCameraReady && <PerformanceStats />}
        
        {showOverlay && isCameraReady && (
          <MemoizedHandOverlay
            hands={hands}
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
            isActive={hands.length > 0}
          />
        )}
      </div>
      
      {/* Two-hand tracking hint */}
      {isCameraReady && hands.length === 1 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(251, 191, 36, 0.9)',
          color: '#000',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 10,
          animation: 'pulse 2s infinite'
        }}>
          👋 Show both hands for better tracking
        </div>
      )}
    </div>
  );
};

// Add CSS animations
const styles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default memo(CameraView);
