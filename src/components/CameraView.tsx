import { useEffect, useRef, useState } from 'react';
import HandOverlay from './HandOverlay';
import type { HandData } from '../hooks/useHandTracking';

interface CameraViewProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
  hands?: HandData[];
  showOverlay?: boolean;
}

export default function CameraView({ onVideoReady, hands = [], showOverlay = true }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 });

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsLoading(false);
            
            if (videoRef.current) {
              setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
              });
            }
            
            if (onVideoReady && videoRef.current) {
              onVideoReady(videoRef.current);
            }
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
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onVideoReady]);

  return (
    <div className="camera-container" ref={containerRef}>
      {isLoading && (
        <div className="loading-overlay">
          <p>Loading camera...</p>
        </div>
      )}
      
      {error && (
        <div className="error-overlay">
          <p>{error}</p>
        </div>
      )}

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          style={{
            width: '100%',
            maxWidth: '1200px',
            height: 'auto',
            transform: 'scaleX(-1)',
            border: '2px solid #333',
            borderRadius: '8px',
            display: 'block',
          }}
        />
        
        {showOverlay && (
          <HandOverlay
            hands={hands}
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
          />
        )}
      </div>
    </div>
  );
}
