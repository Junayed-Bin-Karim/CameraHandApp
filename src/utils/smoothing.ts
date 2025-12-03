export class CoordinateSmoother {
  private lastX: number | null = null;
  private lastY: number | null = null;
  private smoothingFactor: number;

  constructor(smoothingFactor = 0.5) {
    this.smoothingFactor = Math.max(0, Math.min(1, smoothingFactor));
  }

  smooth(x: number, y: number): { x: number; y: number } {
    if (this.lastX === null || this.lastY === null) {
      this.lastX = x;
      this.lastY = y;
      return { x, y };
    }

    this.lastX = this.lastX * this.smoothingFactor + x * (1 - this.smoothingFactor);
    this.lastY = this.lastY * this.smoothingFactor + y * (1 - this.smoothingFactor);

    return {
      x: this.lastX,
      y: this.lastY,
    };
  }

  reset() {
    this.lastX = null;
    this.lastY = null;
  }
}
