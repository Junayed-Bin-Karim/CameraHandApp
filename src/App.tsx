import { useState, useCallback } from 'react';
import CameraView from './components/CameraView';
import VirtualCursor from './components/VirtualCursor';
import InteractiveElements, { type DraggableBox } from './components/InteractiveElements';
import DrawingCanvas from './components/DrawingCanvas';
import DemoButtons from './components/Buttons';
import PerformanceStats from './components/PerformanceStats';
import useHandTracking from './hooks/useHandTracking';
import './App.css';

function App() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isFist, setIsFist] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [boxes, setBoxes] = useState<DraggableBox[]>([]);
  
  const onVideoReady = useCallback((video: HTMLVideoElement) => {
    setVideoElement(video);
  }, []);

  const onCursorMove = useCallback((pos: { x: number; y: number }, visible: boolean) => {
    setCursorPosition(pos);
    setIsCursorVisible(visible);
  }, []);

  const onPinch = useCallback((val: boolean) => {
    setIsPinching(val);
  }, []);

  const onFist = useCallback((val: boolean) => {
    setIsFist(val);
  }, []);

  const onBtnAction = useCallback((action: string) => {
    const colors = ['#FFF9C4', '#FFE4E1', '#E0F7FA', '#F3E5F5', '#E8F5E9', '#FFF3E0'];
    
    switch (action) {
      case 'add-box':
        setBoxes(prevBoxes => {
          const newId = Math.max(...prevBoxes.map(b => b.id), 0) + 1;
          const notepadWidth = 200;
          const notepadHeight = 250;
          
          const maxX = window.innerWidth - notepadWidth - 20;
          const maxY = window.innerHeight - notepadHeight - 20;
          const minX = 20;
          const minY = 20;
          
          const randomX = minX + Math.random() * Math.max(0, maxX - minX);
          const randomY = minY + Math.random() * Math.max(0, maxY - minY);
          
          return [...prevBoxes, {
            id: newId,
            x: randomX,
            y: randomY,
            width: notepadWidth,
            height: notepadHeight,
            color: '#FFF9C4',
            label: `Note ${newId}`,
            text: '',
          }];
        });
        break;
        
      case 'clear-all':
        setBoxes([]);
        break;
        
      case 'random-colors':
        setBoxes(prevBoxes => prevBoxes.map(box => ({
          ...box,
          color: colors[Math.floor(Math.random() * colors.length)],
        })));
        break;
        
      case 'toggle-draw':
        setIsDrawingMode(!isDrawingMode);
        break;
    }
  }, [isDrawingMode]);

  const { isTracking, hands } = useHandTracking({ 
    videoElement,
  });

  return (
    <div className="app">
      <label
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'rgba(26, 26, 46, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          color: '#e0e0e0',
          fontSize: '14px',
          cursor: 'pointer',
          zIndex: 10001,
          backdropFilter: 'blur(10px)',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={showPerformanceStats}
          onChange={(e) => setShowPerformanceStats(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        Show Performance
      </label>

      <main className="app-main">
        <CameraView 
          onVideoReady={onVideoReady}
          hands={hands}
          showOverlay={true}
        />
      </main>
      
      <div className="info-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        maxWidth: '1400px',
        margin: '1.5rem auto 2rem',
        padding: '0 2rem',
      }}>
        <div className="status">
          {videoElement && (
            <>
              <p>Camera connected</p>
              {isTracking && <p>Hand tracking: {hands.length} hand(s) detected</p>}
            </>
          )}
          {!videoElement && <p>Initializing camera...</p>}
        </div>

        <div className="status">
          <p style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: '#8b5cf6' }}>How to Use:</p>
          <ul style={{ textAlign: 'left', fontSize: '0.95rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
            <li>Your index finger controls the cursor</li>
            <li>Pinch (thumb + index) to click</li>
            <li>Make a fist to drag notes</li>
            <li>Use left buttons to add/manage notes</li>
          </ul>
        </div>
      </div>

      <VirtualCursor 
        hands={hands} 
        onPosChange={onCursorMove}
        onPinch={onPinch}
        onFist={onFist}
      />
      {!isDrawingMode && (
        <>
          <InteractiveElements 
            cursorPosition={cursorPosition} 
            isHandDetected={isCursorVisible}
            isPinching={isPinching}
            isFist={isFist}
            boxes={boxes}
            onBoxesChange={setBoxes}
          />
          <DemoButtons
            cursorPosition={cursorPosition}
            isHandDetected={isCursorVisible}
            isPinching={isPinching}
            isFist={isFist}
            onAction={onBtnAction}
          />
        </>
      )}
      <DrawingCanvas
        cursorPosition={cursorPosition}
        isHandDetected={isCursorVisible}
        isPinching={isPinching}
        isDrawingMode={isDrawingMode}
        onExit={() => setIsDrawingMode(false)}
      />
      {showPerformanceStats && <PerformanceStats hands={hands} isTracking={isTracking} />}
      
      <footer className="app-footer">
        <p className="footer-credit">
          Built by <a href="https://dixonjo.com" target="_blank" rel="noopener noreferrer">Joshua Dixon</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
