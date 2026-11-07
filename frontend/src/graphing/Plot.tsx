import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from "react";
import { Plus, Minus, Maximize2, Crosshair, Ratio } from "lucide-react";
import type {
  Project,
  SampledCurve,
  Viewport,
  Point2,
} from "../mathematics/types";
import { defaultView, validViewport } from "../state/project";
function stepFor(span: number, target = 10) {
  const raw = span / target,
    p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].find((n) => n * p >= raw)! * p;
}
function ticks(lo: number, hi: number) {
  const s = stepFor(hi - lo),
    values: number[] = [];
  for (
    let x = Math.ceil(lo / s) * s;
    x <= hi + 1e-10 && values.length < 80;
    x += s
  )
    values.push(Math.abs(x) < s / 1000 ? 0 : x);
  return values;
}
export function numberLabel(x: number) {
  if (x === 0) return "0";
  return Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3
    ? x.toExponential(1)
    : Number(x.toPrecision(5)).toString();
}
interface Props {
  project: Project;
  samples: SampledCurve[];
  light: boolean;
  busy: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
  onView: (v: Viewport) => void;
  area?: { id: string; lo: number; hi: number };
  onInspect: (x: number) => void;
}
export function Plot({
  project,
  samples,
  light,
  busy,
  svgRef,
  onView,
  area,
  onInspect,
}: Props) {
  const holder = useRef<HTMLDivElement>(null),
    drag = useRef<{
      px: number;
      py: number;
      view: Viewport;
      last: Viewport;
    } | null>(null);
  const [size, setSize] = useState({ w: 900, h: 540 }),
    [temporary, setTemporary] = useState<Viewport | null>(null),
    [hover, setHover] = useState<Point2 | null>(null);
  const view = temporary ?? project.viewport;
  const { w, h } = size,
    xSpan = view.xMax - view.xMin,
    ySpan = view.yMax - view.yMin;
  const sx = (x: number) => ((x - view.xMin) / xSpan) * w,
    sy = (y: number) => h - ((y - view.yMin) / ySpan) * h;
  const world = (px: number, py: number): Point2 => [
    view.xMin + (px / w) * xSpan,
    view.yMax - (py / h) * ySpan,
  ];
  useEffect(() => {
    if (!holder.current) return;
    const r = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: Math.max(1, width), h: Math.max(1, height) });
    });
    r.observe(holder.current);
    return () => r.disconnect();
  }, []);
  function zoom(factor: number, px = w / 2, py = h / 2) {
    const [x, y] = world(px, py);
    const v = {
      xMin: x + (view.xMin - x) * factor,
      xMax: x + (view.xMax - x) * factor,
      yMin: y + (view.yMin - y) * factor,
      yMax: y + (view.yMax - y) * factor,
    };
    if (validViewport(v)) onView(v);
  }
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(
        Math.exp(Math.max(-0.25, Math.min(0.25, e.deltaY * 0.001))),
        e.clientX - r.left,
        e.clientY - r.top,
      );
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  });
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect(),
      px = e.clientX - r.left,
      py = e.clientY - r.top;
    if (drag.current) {
      const d = drag.current,
        dx = ((e.clientX - d.px) / w) * (d.view.xMax - d.view.xMin),
        dy = ((e.clientY - d.py) / h) * (d.view.yMax - d.view.yMin);
      const next = {
        xMin: d.view.xMin - dx,
        xMax: d.view.xMax - dx,
        yMin: d.view.yMin + dy,
        yMax: d.view.yMax + dy,
      };
      if (validViewport(next)) {
        d.last = next;
        setTemporary(next);
      }
    } else setHover(world(px, py));
  }
  function endDrag(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setTemporary(null);
    if (Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py) < 4) {
      const r = e.currentTarget.getBoundingClientRect();
      onInspect(world(e.clientX - r.left, e.clientY - r.top)[0]);
    } else onView(d.last);
  }
  const foreground = light ? "#485b6a" : "#788994",
    grid = light ? "#e0e7eb" : "#20292f",
    axis = light ? "#a2b1ba" : "#46545e",
    bg = light ? "#f7f9fa" : "#0f1419";
  const xTicks = ticks(view.xMin, view.xMax),
    yTicks = ticks(view.yMin, view.yMax);
  const path = (points: Point2[]) =>
    points
      .map(
        ([x, y], i) =>
          `${i ? "L" : "M"}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`,
      )
      .join(" ");
  return (
    <div className="plot-wrap" ref={holder}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Interactive mathematical graph. Drag to pan, scroll to zoom, click to select an x coordinate."
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            px: e.clientX,
            py: e.clientY,
            view: { ...view },
            last: { ...view },
          };
          setHover(null);
        }}
        onPointerMove={pointerMove}
        onPointerUp={endDrag}
        onPointerCancel={() => {
          drag.current = null;
          setTemporary(null);
        }}
        onPointerLeave={() => {
          if (!drag.current) setHover(null);
        }}
        onDoubleClick={() => onView({ ...defaultView })}
        onKeyDown={(e) => {
          const dx = xSpan * 0.1,
            dy = ySpan * 0.1;
          if (e.key === "+" || e.key === "=") zoom(0.8);
          else if (e.key === "-") zoom(1.25);
          else if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
          ) {
            e.preventDefault();
            const x =
                e.key === "ArrowLeft" ? -dx : e.key === "ArrowRight" ? dx : 0,
              y = e.key === "ArrowDown" ? -dy : e.key === "ArrowUp" ? dy : 0;
            const next = {
              xMin: view.xMin + x,
              xMax: view.xMax + x,
              yMin: view.yMin + y,
              yMax: view.yMax + y,
            };
            if (validViewport(next)) onView(next);
          }
        }}
      >
        <rect width={w} height={h} fill={bg} />
        <defs>
          <clipPath id="plot-clip">
            <rect width={w} height={h} />
          </clipPath>
        </defs>
        {project.grid && (
          <g stroke={grid} strokeWidth="1">
            {xTicks.map((x) => (
              <line key={`x${x}`} x1={sx(x)} y1={0} x2={sx(x)} y2={h} />
            ))}
            {yTicks.map((y) => (
              <line key={`y${y}`} x1={0} y1={sy(y)} x2={w} y2={sy(y)} />
            ))}
          </g>
        )}
        {project.axes && (
          <g stroke={axis} strokeWidth="1.2">
            <line x1={sx(0)} x2={sx(0)} y1={0} y2={h} />
            <line x1={0} x2={w} y1={sy(0)} y2={sy(0)} />
          </g>
        )}
        <g fill={foreground} fontSize="11" fontFamily="ui-monospace,monospace">
          {xTicks
            .filter((x) => x !== 0)
            .map((x) => (
              <text
                key={x}
                x={sx(x) + 5}
                y={Math.max(16, Math.min(h - 10, sy(0) + 18))}
              >
                {numberLabel(x)}
              </text>
            ))}
          {yTicks
            .filter((y) => y !== 0)
            .map((y) => (
              <text
                key={y}
                x={Math.max(10, Math.min(w - 44, sx(0) + 10))}
                y={sy(y) - 7}
              >
                {numberLabel(y)}
              </text>
            ))}
          <text x={w - 20} y={Math.max(20, Math.min(h - 15, sy(0) - 12))}>
            x
          </text>
          <text x={Math.max(10, Math.min(w - 20, sx(0) + 12))} y={20}>
            y
          </text>
        </g>
        <g clipPath="url(#plot-clip)">
          {area &&
            samples
              .find((s) => s.id === area.id)
              ?.segments.map((segment, i) => {
                const p = segment.filter(
                  ([x]) =>
                    x >= Math.min(area.lo, area.hi) &&
                    x <= Math.max(area.lo, area.hi),
                );
                return p.length > 1 ? (
                  <path
                    key={`area${i}`}
                    d={`${path(p)} L${sx(p[p.length - 1][0])},${sy(0)} L${sx(p[0][0])},${sy(0)} Z`}
                    fill={
                      project.curves.find((c) => c.id === area.id)?.color ??
                      "#83cdbd"
                    }
                    opacity="0.13"
                  />
                ) : null;
              })}
          {samples.map((sample) => {
            const c = project.curves.find(
              (c) => sample.id === c.id || sample.id.startsWith(c.id + ":"),
            );
            return sample.segments.map((segment, i) => (
              <path
                key={`${sample.id}${i}`}
                d={path(segment)}
                fill="none"
                stroke={
                  sample.id.endsWith(":tangent")
                    ? "#b7c7d2"
                    : (c?.color ?? "#83cdbd")
                }
                strokeWidth={
                  sample.id.includes(":")
                    ? 1.6
                    : c?.id === project.selectedId
                      ? 2.6
                      : 2
                }
                strokeDasharray={sample.id.includes(":") ? "6 5" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ));
          })}
          {hover && (
            <g data-inspection="true">
              <line
                x1={sx(hover[0])}
                x2={sx(hover[0])}
                y1={0}
                y2={h}
                stroke={axis}
                strokeDasharray="3 5"
              />
              <circle
                cx={sx(hover[0])}
                cy={sy(hover[1])}
                r="3"
                fill={foreground}
              />
            </g>
          )}
        </g>
      </svg>
      <div className="plot-badge">
        <span className="live-dot" />
        LIVE CANVAS <span>·</span> 2D
      </div>
      <div className="plot-controls">
        <button aria-label="Zoom in" onClick={() => zoom(0.8)}>
          <Plus size={16} />
        </button>
        <button aria-label="Zoom out" onClick={() => zoom(1.25)}>
          <Minus size={16} />
        </button>
        <button
          aria-label="Reset view"
          onClick={() => onView({ ...defaultView })}
        >
          <Crosshair size={16} />
        </button>
        <button
          aria-label="Equal axis scale"
          title="Equal axis scale"
          onClick={() => {
            const scale = Math.max(xSpan / w, ySpan / h),
              cx = (view.xMin + view.xMax) / 2,
              cy = (view.yMin + view.yMax) / 2;
            const next = {
              xMin: cx - (w * scale) / 2,
              xMax: cx + (w * scale) / 2,
              yMin: cy - (h * scale) / 2,
              yMax: cy + (h * scale) / 2,
            };
            if (validViewport(next)) onView(next);
          }}
        >
          <Ratio size={16} />
        </button>
        <button
          aria-label="Fullscreen graph"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void holder.current?.requestFullscreen().catch(() => {});
          }}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      {hover && (
        <div className="coordinate-readout">
          x {hover[0].toFixed(3)} <span>y {hover[1].toFixed(3)}</span>
        </div>
      )}
      {busy && <div className="sampling-badge">Calculating…</div>}
      {!project.curves.length && (
        <div className="empty-canvas">
          <strong>A blank space for your next idea.</strong>
          <p>Add an expression or open an example to begin.</p>
        </div>
      )}
      <div className="plot-hint">
        Drag to pan <span>·</span> Scroll to zoom <span>·</span> Click to
        inspect
      </div>
    </div>
  );
}
