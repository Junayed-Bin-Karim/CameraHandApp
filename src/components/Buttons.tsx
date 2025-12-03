import { useState, useEffect, useRef } from 'react';
import { inRect, type Rect } from '../utils/geometry';

interface DemoButtonsProps {
  cursorPosition: {x: number, y: number};
  isHandDetected: boolean;
  isPinching: boolean;
  isFist: boolean;
  onAction: (action: string) => void;
}

interface Button extends Rect {
  id: string;
  label: string;
  icon: string;
  color: string;
  action: string;
}

export default function DemoButtons({ cursorPosition, isHandDetected, isPinching, isFist, onAction }: DemoButtonsProps) {
  const [buttons] = useState<Button[]>([
    { id: '1', x: 50, y: 150, width: 160, height: 80, label: 'Add Note', icon: 'plus', color: '#4ECDC4', action: 'add-box' },
    { id: '2', x: 50, y: 250, width: 160, height: 80, label: 'Clear All', icon: 'trash', color: '#FF6B6B', action: 'clear-all' },
    { id: '3', x: 50, y: 350, width: 160, height: 80, label: 'Random Colors', icon: 'palette', color: '#FFA07A', action: 'random-colors' },
    { id: '4', x: 50, y: 450, width: 160, height: 80, label: 'Draw Mode', icon: 'pen', color: '#8b5cf6', action: 'toggle-draw' },
  ]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<Record<string, boolean>>({});
  const lastPinch = useRef(false);

  useEffect(() => {
    const current = isHandDetected
      ? buttons.find(btn => inRect(cursorPosition, btn))
      : null;

    if (current?.id !== hovered) {
      setHovered(current?.id || null);
    }
  }, [cursorPosition, isHandDetected, buttons, hovered]);

  useEffect(() => {
    if (isPinching && !lastPinch.current && hovered && !cooldown[hovered] && !isFist) {
      const btn = buttons.find(b => b.id === hovered);
      if (btn) {
        setLastClicked(hovered);
        setCooldown(prev => ({ ...prev, [hovered]: true }));
        onAction(btn.action);
        
        setTimeout(() => {
          setCooldown(prev => ({ ...prev, [hovered]: false }));
        }, 500);
      }
    }

    lastPinch.current = isPinching;
  }, [isPinching, hovered, cooldown, buttons, onAction, isFist]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 900,
      }}
    >
      {buttons.map(btn => {
        const isHovered = hovered === btn.id;
        const wasClicked = lastClicked === btn.id && cooldown[btn.id];

        return (
          <div
            key={btn.id}
            style={{
              position: 'absolute',
              left: `${btn.x}px`,
              top: `${btn.y}px`,
              width: `${btn.width}px`,
              height: `${btn.height}px`,
              backgroundColor: btn.color,
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '16px',
              color: 'white',
              cursor: 'pointer',
              pointerEvents: 'auto',
              transition: 'transform 0.2s, box-shadow 0.2s',
              transform: wasClicked ? 'scale(0.95)' : isHovered ? 'scale(1.1)' : 'scale(1)',
              boxShadow: isHovered
                ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.5)'
                : '0 4px 12px rgba(0, 0, 0, 0.2)',
              userSelect: 'none',
              border: isHovered ? '3px solid white' : '3px solid transparent',
            }}
            onClick={() => onAction(btn.action)}
            className="gesture-button"
          >
            {btn.icon === 'plus' && (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            )}
            {btn.icon === 'trash' && (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            )}
            {btn.icon === 'palette' && (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                <circle cx="13.5" cy="6.5" r=".5"></circle>
                <circle cx="17.5" cy="10.5" r=".5"></circle>
                <circle cx="8.5" cy="7.5" r=".5"></circle>
                <circle cx="6.5" cy="12.5" r=".5"></circle>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
              </svg>
            )}
            {btn.icon === 'pen' && (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
                <circle cx="11" cy="11" r="2"></circle>
              </svg>
            )}
            <div style={{ fontSize: '14px' }}>{btn.label}</div>
            {isHovered && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-35px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isPinching ? 'Clicking...' : 'Pinch to click'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
