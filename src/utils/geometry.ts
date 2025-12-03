export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function inRect(p: {x: number, y: number}, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.width &&
         p.y >= r.y && p.y <= r.y + r.height;
}

export function inBounds(p: {x: number, y: number}, minX: number, maxX: number, minY: number, maxY: number) {
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

export function getWindowSize() {
  return { w: window.innerWidth, h: window.innerHeight };
}

export function randomPos(itemW: number, itemH: number, margin = 20) {
  const { w, h } = getWindowSize();
  const maxX = w - itemW - margin;
  const maxY = h - itemH - margin;
  return {
    x: margin + Math.random() * Math.max(0, maxX - margin),
    y: margin + Math.random() * Math.max(0, maxY - margin),
  };
}

export function centerX(width: number) {
  return (window.innerWidth - width) / 2;
}

export function dist(a: {x: number, y: number}, b: {x: number, y: number}) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function dist3D(
  a: { x: number; y: number; z?: number },
  b: { x: number; y: number; z?: number },
  zWeight = 1
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = ((a.z || 0) - (b.z || 0)) * zWeight;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
