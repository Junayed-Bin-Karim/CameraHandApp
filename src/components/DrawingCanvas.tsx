import { useEffect, useRef, useState } from 'react';

interface DrawingCanvasProps {
  cursorPosition: { x: number; y: number };
  isHandDetected: boolean;
  isPinching: boolean;
  isDrawingMode: boolean;
  onExit: () => void;
}

// stroke = array of points with color/size
interface DrawStroke {
  points: {x: number, y: number, color: string, size: number}[];
  color: string;
  size: number;
}

export default function DrawingCanvas({ cursorPosition, isHandDetected, isPinching, isDrawingMode, onExit }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const colorRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sizeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const clearRef = useRef<HTMLButtonElement>(null);
  
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number, color: string, size: number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#FF6B6B');
  const [brushSize, setBrushSize] = useState(5);
  const lastPinchState = useRef(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const lastClickState = useRef(false);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#000000', '#FFFFFF'];
  const sizes = [3, 5, 8, 12];

  useEffect(() => {
    if (!isDrawingMode || !isHandDetected) {
      setHoveredButton(null);
      return;
    }

    const { x, y } = cursorPosition;
    const inEl = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    if (inEl(exitRef.current)) {
      setHoveredButton('exit');
    } else if (inEl(clearRef.current)) {
      setHoveredButton('clear');
    } else {
      const colorIdx = colorRefs.current.findIndex(el => inEl(el));
      if (colorIdx >= 0) {
        setHoveredButton(`color-${colorIdx}`);
      } else {
        const sizeIdx = sizeRefs.current.findIndex(el => inEl(el));
        if (sizeIdx >= 0) {
          setHoveredButton(`size-${sizeIdx}`);
        } else {
          setHoveredButton(null);
        }
      }
    }
  }, [cursorPosition, isHandDetected, isDrawingMode]);

  useEffect(() => {
    if (!isDrawingMode || !hoveredButton) return;

    if (isPinching && !lastClickState.current) {
      if (hoveredButton === 'exit') {
        onExit();
      } else if (hoveredButton.startsWith('color-')) {
        const colorIndex = parseInt(hoveredButton.split('-')[1]);
        setBrushColor(colors[colorIndex]);
      } else if (hoveredButton.startsWith('size-')) {
        const sizeIndex = parseInt(hoveredButton.split('-')[1]);
        setBrushSize(sizes[sizeIndex]);
      } else if (hoveredButton === 'clear') {
        setStrokes([]);
        setCurrentStroke([]);
      }
    }

    lastClickState.current = isPinching;
  }, [isPinching, hoveredButton, isDrawingMode, colors, sizes, onExit]);

  useEffect(() => {
    if (!isDrawingMode || !isHandDetected) {
      if (isDrawing) {
        if (currentStroke.length > 0) {
          setStrokes(prev => [...prev, { points: currentStroke, color: brushColor, size: brushSize }]);
          setCurrentStroke([]);
        }
        setIsDrawing(false);
      }
      return;
    }

    if (isPinching && !lastPinchState.current) {
      setIsDrawing(true);
      setCurrentStroke([{ x: cursorPosition.x, y: cursorPosition.y, color: brushColor, size: brushSize }]);
    }

    if (isPinching && isDrawing) {
      setCurrentStroke([...currentStroke, { x: cursorPosition.x, y: cursorPosition.y, color: brushColor, size: brushSize }]);
    }

    if (!isPinching && lastPinchState.current && isDrawing) {
      if (currentStroke.length > 0) {
        setStrokes(prev => [...prev, { points: currentStroke, color: brushColor, size: brushSize }]);
        setCurrentStroke([]);
      }
      setIsDrawing(false);
    }

    lastPinchState.current = isPinching;
  }, [isPinching, isHandDetected, cursorPosition, isDrawing, currentStroke, brushColor, brushSize, isDrawingMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      
      ctx.stroke();
    });

    if (currentStroke.length > 1) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      
      ctx.stroke();
    }
  }, [strokes, currentStroke, brushColor, brushSize]);

  if (!isDrawingMode) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 500,
        }}
      />
      
      <div
        ref={toolbarRef}
        className="drawing-toolbar"
        style={{
          position: 'fixed',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          padding: '16px',
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          borderRadius: '12px',
          alignItems: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: 'calc(100vw - 2rem)',
          overflowX: 'auto',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          ref={exitRef}
          onClick={onExit}
          style={{
            padding: '8px 16px',
            background: hoveredButton === 'exit' ? '#ff6666' : '#ff4444',
            color: 'white',
            border: hoveredButton === 'exit' ? '2px solid white' : 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            transform: hoveredButton === 'exit' ? 'scale(1.1)' : 'scale(1)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#ff6666')}
          onMouseLeave={(e) => (e.currentTarget.style.background = hoveredButton === 'exit' ? '#ff6666' : '#ff4444')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Exit
        </button>

        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.2)' }} />
        
        <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: '600' }}>Colors</span>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {colors.map((color, index) => (
            <button
              key={color}
              ref={el => { colorRefs.current[index] = el; }}
              onClick={() => setBrushColor(color)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: color,
                border: brushColor === color ? '3px solid white' : (hoveredButton === `color-${index}` ? '3px solid rgba(255,255,255,0.8)' : '2px solid rgba(255,255,255,0.3)'),
                cursor: 'pointer',
                transition: 'transform 0.2s',
                transform: hoveredButton === `color-${index}` ? 'scale(1.2)' : 'scale(1)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#888', fontSize: '12px' }}>Size:</span>
          {sizes.map((size, index) => (
            <button
              key={size}
              ref={el => { sizeRefs.current[index] = el; }}
              onClick={() => setBrushSize(size)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                backgroundColor: brushSize === size ? 'white' : (hoveredButton === `size-${index}` ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'),
                color: brushSize === size ? 'black' : 'white',
                border: hoveredButton === `size-${index}` ? '2px solid white' : 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                transform: hoveredButton === `size-${index}` ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s',
              }}
            >
              {size}
            </button>
          ))}
        </div>

        <button
          ref={clearRef}
          onClick={() => { setStrokes([]); setCurrentStroke([]); }}
          style={{
            padding: '8px 16px',
            backgroundColor: hoveredButton === 'clear' ? '#ff6666' : '#ff4444',
            color: 'white',
            border: hoveredButton === 'clear' ? '2px solid white' : 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            marginLeft: '8px',
            transform: hoveredButton === 'clear' ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.2s',
          }}
        >
          Clear
        </button>
      </div>
    </>
  );
}
