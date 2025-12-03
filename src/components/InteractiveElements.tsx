import { useState, useEffect, useRef } from 'react';
import { inRect } from '../utils/geometry';

export interface DraggableBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  text: string;
}

interface InteractiveElementsProps {
  cursorPosition: {x: number, y: number};
  isHandDetected: boolean;
  isPinching: boolean;
  isFist: boolean;
  boxes: DraggableBox[];
  onBoxesChange: (boxes: DraggableBox[]) => void;
}

export default function InteractiveElements({ cursorPosition, isHandDetected, isPinching, isFist, boxes, onBoxesChange }: InteractiveElementsProps) {

  const [draggedBox, setDraggedBox] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingBox, setEditingBox] = useState<number | null>(null);
  const lastFistState = useRef(false);
  const fistTimer = useRef<number | null>(null);
  const lastPinchState = useRef(false);
  const pinchTimer = useRef<number | null>(null);
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    if (!isHandDetected) {
      setDraggedBox(null);
      lastFistState.current = false;
      lastPinchState.current = false;
      if (fistTimer.current) {
        clearTimeout(fistTimer.current);
        fistTimer.current = null;
      }
      if (pinchTimer.current) {
        clearTimeout(pinchTimer.current);
        pinchTimer.current = null;
      }
      return;
    }

    if (isFist && !lastFistState.current) {
      if (fistTimer.current) {
        clearTimeout(fistTimer.current);
        fistTimer.current = null;
      }

      const hoveredBox = boxes.find(box => inRect(cursorPosition, box));
      
      if (hoveredBox) {
        setEditingBox(null);
        setDraggedBox(hoveredBox.id);
        setDragOffset({
          x: cursorPosition.x - hoveredBox.x,
          y: cursorPosition.y - hoveredBox.y,
        });
      }
    }

    if (!isFist && lastFistState.current) {
      if (draggedBox !== null && editingBox === null) {
        if (fistTimer.current) {
          clearTimeout(fistTimer.current);
        }
        
        fistTimer.current = window.setTimeout(() => {
          setDraggedBox(null);
          fistTimer.current = null;
        }, 100);
      }
    }

    if (isFist && fistTimer.current) {
      clearTimeout(fistTimer.current);
      fistTimer.current = null;
    }

    if (draggedBox !== null && editingBox === null) {
      onBoxesChange(boxes.map(box =>
        box.id === draggedBox
          ? { 
              ...box, 
              x: cursorPosition.x - dragOffset.x, 
              y: cursorPosition.y - dragOffset.y 
            }
          : box
      ));
    }

    if (isPinching && !lastPinchState.current && !isFist) {
      const hoveredBox = boxes.find(box => inRect(cursorPosition, box));
      
      if (hoveredBox && editingBox !== hoveredBox.id) {
        pinchTimer.current = window.setTimeout(() => {
          setEditingBox(hoveredBox.id);
          setDraggedBox(null);
          if (textareaRefs.current[hoveredBox.id]) {
            textareaRefs.current[hoveredBox.id]?.focus();
          }
          pinchTimer.current = null;
        }, 400);
      }
    }

    if (!isPinching && lastPinchState.current) {
      if (pinchTimer.current) {
        clearTimeout(pinchTimer.current);
        pinchTimer.current = null;
      }
    }

    lastFistState.current = isFist;
    lastPinchState.current = isPinching;
  }, [isFist, isPinching, isHandDetected, cursorPosition, boxes, draggedBox, editingBox, dragOffset, onBoxesChange]);

  const handleMouseDown = (boxId: number, e: React.MouseEvent) => {
    e.preventDefault();
    const box = boxes.find(b => b.id === boxId);
    if (box) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      
      if (clickY < 40) {
        setEditingBox(null);
        setDraggedBox(boxId);
        setDragOffset({
          x: e.clientX - box.x,
          y: e.clientY - box.y,
        });
      }
    }
  };

  const handleBoxClick = (boxId: number) => {
    setEditingBox(boxId);
  };

  const handleTextChange = (boxId: number, newText: string) => {
    onBoxesChange(boxes.map(box =>
      box.id === boxId ? { ...box, text: newText } : box
    ));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedBox !== null) {
      onBoxesChange(boxes.map(box =>
        box.id === draggedBox
          ? { ...box, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
          : box
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggedBox(null);
  };

  const hoveredBox = isHandDetected
    ? boxes.find(box => inRect(cursorPosition, box))
    : null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {boxes.map(box => {
        const isHovered = hoveredBox?.id === box.id;

        return (
          <div
            key={box.id}
            onMouseDown={(e) => handleMouseDown(box.id, e)}
            style={{
              position: 'absolute',
              left: `${box.x}px`,
              top: `${box.y}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
              backgroundColor: box.color,
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              fontWeight: 'normal',
              fontSize: '14px',
              color: '#333',
              cursor: 'grab',
              pointerEvents: 'auto',
              transition: isHovered ? 'none' : 'transform 0.2s',
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
              boxShadow: isHovered
                ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.5)'
                : '0 4px 12px rgba(0, 0, 0, 0.15)',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: '#666',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'grab',
                minHeight: '28px',
              }}
            >
              {box.label}
            </div>

            <textarea
              ref={(el) => { textareaRefs.current[box.id] = el; }}
              value={box.text}
              onChange={(e) => handleTextChange(box.id, e.target.value)}
              onClick={() => handleBoxClick(box.id)}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Pinch and hold to write..."
              readOnly={editingBox !== box.id}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                backgroundColor: 'transparent',
                resize: 'none',
                outline: 'none',
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#333',
                cursor: editingBox === box.id ? 'text' : 'grab',
                lineHeight: '1.5',
              }}
            />
            
            {isHovered && (
              <div
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                }}
              >
                Hovering
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
