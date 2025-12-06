import { useEffect, useRef, useState, useCallback } from 'react';
import HandOverlay from './HandOverlay';
import type { HandData } from '../hooks/useHandTracking';

interface CameraViewProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
  hands?: HandData[];
  showOverlay?: boolean;
  fps?: number;
}

export default function CameraView({ 
  onVideoReady, 
  hands = [], 
  showOverlay = true,
  fps 
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Memoize the video ready handler
  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    if (onVideoReady) {
      onVideoReady(video);
    }
  }, [onVideoReady]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let videoTrack: MediaStreamTrack | null = null;

    const startCamera = async () => {
      try {
        // Request lower resolution for faster processing
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: 'user',
            frameRate: { ideal: 60, max: 60 }, // Request 60 FPS from camera
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Get video track for constraints
          videoTrack = stream.getVideoTracks()[0];
          
          // Apply additional optimizations if supported
          if (videoTrack && 'applyConstraints' in videoTrack) {
            try {
              await videoTrack.applyConstraints({
                advanced: [{ frameRate: 60 }]
              });
            } catch (e) {
              console.log('Frame rate constraint not fully supported');
            }
          }

          videoRef.current.onloadeddata = () => {
            videoRef.current?.play().then(() => {
              setIsLoading(false);
              setIsCameraReady(true);
              
              if (videoRef.current) {
                setVideoDimensions({
                  width: videoRef.current.videoWidth,
                  height: videoRef.current.videoHeight,
                });
              }
              
              if (videoRef.current) {
                handleVideoReady(videoRef.current);
              }
            }).catch(err => {
              console.error('Video play error:', err);
              setIsLoading(false);
            });
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Failed to access camera. Please ensure camera permissions are granted.');
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
      setIsCameraReady(false);
    };
  }, [handleVideoReady]);

  // Performance stats display
  const PerformanceStats = () => (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 100,
      pointerEvents: 'none'
    }}>
      <div>FPS: {fps ? fps.toFixed(1) : '--'}</div>
      <div>Hands: {hands.length}</div>
      <div>Confidence: {hands.length > 0 ? (hands[0].score * 100).toFixed(1) + '%' : '--'}</div>
    </div>
  );

  return (
    <div className="camera-container" ref={containerRef}>
      {isLoading && (
        <div className="loading-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          color: 'white',
        }}>
          <p>Initializing camera...</p>
        </div>
      )}
      
      {error && (
        <div className="error-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          color: 'red',
          padding: '20px',
          textAlign: 'center',
        }}>
          <p>{error}</p>
        </div>
      )}

      <div style={{ 
        position: 'relative', 
        display: 'inline-block',
        maxWidth: '100%'
      }}>
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: '800px', // Reduced for better performance
            height: 'auto',
            transform: 'scaleX(-1)',
            border: '2px solid #333',
            borderRadius: '8px',
            display: 'block',
            backgroundColor: '#000',
          }}
          onError={(e) => {
            console.error('Video error:', e);
            setError('Video stream error');
            setIsLoading(false);
          }}
        />
        
        {isCameraReady && fps && <PerformanceStats />}
        
        {showOverlay && isCameraReady && (
          <HandOverlay
            hands={hands}
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
            simplified={fps && fps < 45} // Simplify overlay if FPS drops
          />
        )}
      </div>
    </div>
  );
}
