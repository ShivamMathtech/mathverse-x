import type { Point2, SampledCurve, Viewport } from "../mathematics/types";
import { validViewport } from "../state/project";

/** Nearest interpolated point on actual segments; never connects across a gap. */
export function traceCurve(segments: Point2[][], cursor: Point2, view: Viewport, width: number, height: number): Point2 | null {
  const sx = width / (view.xMax - view.xMin), sy = height / (view.yMax - view.yMin);
  let nearest: Point2 | null = null, distance = Infinity;
  for (const segment of segments) for (let i = 1; i < segment.length; i++) {
    const a = segment[i - 1], b = segment[i];
    const dx = (b[0] - a[0]) * sx, dy = (b[1] - a[1]) * sy;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((cursor[0] - a[0]) * sx * dx + (cursor[1] - a[1]) * sy * dy) / length)) : 0;
    const point: Point2 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    if (point[0] < view.xMin || point[0] > view.xMax || point[1] < view.yMin || point[1] > view.yMax) continue;
    const d = Math.hypot((cursor[0] - point[0]) * sx, (cursor[1] - point[1]) * sy);
    if (d < distance) { nearest = point; distance = d; }
  }
  return nearest;
}
export function fitSamples(samples: SampledCurve[]): Viewport | null {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const s of samples) for (const segment of s.segments) for (const [x, y] of segment) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e7 || Math.abs(y) > 1e7) continue;
    xMin = Math.min(xMin, x); xMax = Math.max(xMax, x); yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
  }
  if (!Number.isFinite(xMin)) return null;
  const dx = Math.max(1, xMax - xMin) * 0.1, dy = Math.max(1, yMax - yMin) * 0.1;
  const view = { xMin: Math.max(-1e7, xMin - dx), xMax: Math.min(1e7, xMax + dx), yMin: Math.max(-1e7, yMin - dy), yMax: Math.min(1e7, yMax + dy) };
  return validViewport(view) ? view : null;
}
