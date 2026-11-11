import {
  SlidersHorizontal,
  ScanLine,
  Sigma,
  Activity,
  Plus,
} from "lucide-react";
import { useWorkspace } from "../state/store";
import { validViewport } from "../state/project";
import { NumberField } from "./NumberField";
export type NumericOperation = "evaluate" | "derivative" | "integral" | "root";
interface Props {
  tab: "properties" | "calculus";
  setTab: (tab: "properties" | "calculus") => void;
  x: number;
  setX: (x: number) => void;
  lo: number;
  setLo: (x: number) => void;
  hi: number;
  setHi: (x: number) => void;
  derivative: boolean;
  setDerivative: (b: boolean) => void;
  tangent: boolean;
  setTangent: (b: boolean) => void;
  area: boolean;
  setArea: (b: boolean) => void;
  run: (op: NumericOperation) => void;
  addDerivative: () => void;
  notify: (message: string) => void;
  busy: boolean;
}
export function Inspector(p: Props) {
  const { project, update, curve } = useWorkspace(),
    selected = project.curves.find((c) => c.id === project.selectedId);
  function bound(key: keyof typeof project.viewport, value: number) {
    const next = { ...project.viewport, [key]: value };
    if (validViewport(next)) update({ viewport: next });
    else p.notify("Minimum bounds must be below maximum bounds.");
  }
  return (
    <aside className="inspector">
      <div className="panel-heading">
        <SlidersHorizontal size={15} />
        <strong>Inspector</strong>
        <span className="tiny-tag">2D</span>
      </div>
      <div className="tabs">
        <button
          className={p.tab === "properties" ? "active" : ""}
          onClick={() => p.setTab("properties")}
        >
          Properties
        </button>
        <button
          className={p.tab === "calculus" ? "active" : ""}
          onClick={() => p.setTab("calculus")}
        >
          Calculus
        </button>
      </div>
      <div className="inspector-content">
        {p.tab === "properties" ? (
          <>
            <section>
              <h3>
                <Activity size={14} /> Dynamic parameters
              </h3>
              <p className="muted">Use a, b and c in any expression.</p>
              {(["a", "b", "c"] as const).map((k) => (
                <label className="parameter" key={k}>
                  <span>
                    <i>{k}</i>
                    <output>{project.parameters[k].toFixed(2)}</output>
                  </span>
                  <input
                    aria-label={`Parameter ${k}`}
                    type="range"
                    min="-10"
                    max="10"
                    step="0.05"
                    value={project.parameters[k]}
                    onChange={(e) =>
                      update({
                        parameters: {
                          ...project.parameters,
                          [k]: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <span className="range-labels">
                    <small>−10</small>
                    <small>10</small>
                  </span>
                </label>
              ))}
            </section>
            <section>
              <h3>
                <ScanLine size={14} /> Viewport
              </h3>
              <div className="field-grid">
                <NumberField
                  label="X min"
                  value={project.viewport.xMin}
                  onChange={(v) => bound("xMin", v)}
                />
                <NumberField
                  label="X max"
                  value={project.viewport.xMax}
                  onChange={(v) => bound("xMax", v)}
                />
                <NumberField
                  label="Y min"
                  value={project.viewport.yMin}
                  onChange={(v) => bound("yMin", v)}
                />
                <NumberField
                  label="Y max"
                  value={project.viewport.yMax}
                  onChange={(v) => bound("yMax", v)}
                />
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={project.grid}
                  onChange={(e) => update({ grid: e.target.checked })}
                />
                Show grid
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={project.axes}
                  onChange={(e) => update({ axes: e.target.checked })}
                />
                Show axes
              </label>
            </section>
            <section>
              <h3>Sampling</h3>
              <label className="stack-label">
                Base intervals
                <select
                  value={project.resolution}
                  onChange={(e) =>
                    update({ resolution: Number(e.target.value) })
                  }
                >
                  {[160, 480, 960, 1600].map((n) => (
                    <option value={n} key={n}>
                      {n}
                      {n === 480
                        ? " · Balanced"
                        : n === 160
                          ? " · Fast"
                          : n === 1600
                            ? " · Fine"
                            : ""}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Curved regions receive extra samples. Nonfinite values break the
                curve.
              </p>
            </section>
            {selected && (
              <section>
                <h3>Selected expression</h3>
                <label className="color-field">
                  Curve color
                  <input
                    aria-label="Curve color"
                    type="color"
                    value={selected.color}
                    onChange={(e) =>
                      curve(selected.id, { color: e.target.value })
                    }
                  />
                </label>
                <div className="field-grid curve-style-fields">
                  <label className="stack-label">Line width<select aria-label="Curve line width" value={selected.lineWidth} onChange={e => curve(selected.id, { lineWidth: Number(e.target.value) })}>
                    {[1, 2, 2.5, 3, 4, 5, 6, ...([1, 2, 2.5, 3, 4, 5, 6].includes(selected.lineWidth) ? [] : [selected.lineWidth])].sort((a,b) => a-b).map(n => <option value={n} key={n}>{n} px</option>)}
                  </select></label>
                  <label className="stack-label">Line style<select aria-label="Curve line style" value={selected.lineStyle} onChange={e => curve(selected.id, { lineStyle: e.target.value as typeof selected.lineStyle })}>
                    <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
                  </select></label>
                </div>
                {selected.kind !== "cartesian" && (
                  <div className="field-grid">
                    <NumberField
                      label="Parameter min"
                      value={selected.tMin}
                      min={-1e5}
                      max={1e5}
                      onChange={(v) =>
                        v < selected.tMax
                          ? curve(selected.id, { tMin: v })
                          : p.notify(
                              "Parameter minimum must be smaller than maximum.",
                            )
                      }
                    />
                    <NumberField
                      label="Parameter max"
                      value={selected.tMax}
                      min={-1e5}
                      max={1e5}
                      onChange={(v) =>
                        v > selected.tMin
                          ? curve(selected.id, { tMax: v })
                          : p.notify(
                              "Parameter maximum must be larger than minimum.",
                            )
                      }
                    />
                  </div>
                )}
              </section>
            )}
          </>
        ) : selected?.kind === "cartesian" ? (
          <>
            <section>
              <div className="selected-function">
                <span style={{ background: selected.color }} />
                Selected function
              </div>
              <code className="selected-code">{selected.expression}</code>
              <p className="muted">
                Results use a, b, c and the displayed time. Calculations pause playback.
              </p>
            </section>
            <section>
              <h3>
                <Sigma size={15} /> Point analysis
              </h3>
              <NumberField label="At x" value={p.x} onChange={p.setX} />
              <div className="button-pair">
                <button onClick={() => p.run("evaluate")} disabled={p.busy}>
                  f(x)
                </button>
                <button onClick={() => p.run("derivative")} disabled={p.busy}>
                  f′(x)
                </button>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.tangent}
                  onChange={(e) => p.setTangent(e.target.checked)}
                />
                Tangent at x
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.derivative}
                  onChange={(e) => p.setDerivative(e.target.checked)}
                />
                Derivative curve
              </label>
              <button
                className="text-action"
                disabled={p.busy}
                onClick={p.addDerivative}
              >
                <Plus size={14} />
                Add symbolic derivative
              </button>
            </section>
            <section>
              <h3>Interval analysis</h3>
              <div className="field-grid">
                <NumberField
                  label="Lower bound"
                  value={p.lo}
                  onChange={p.setLo}
                />
                <NumberField
                  label="Upper bound"
                  value={p.hi}
                  onChange={p.setHi}
                />
              </div>
              <button
                className="wide-button primary-muted"
                disabled={p.busy}
                onClick={() => p.run("integral")}
              >
                Calculate definite integral
              </button>
              <button
                className="wide-button"
                disabled={p.busy}
                onClick={() => p.run("root")}
              >
                Find bracketed root
              </button>
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.area}
                  onChange={(e) => p.setArea(e.target.checked)}
                />
                Shade interval area
              </label>
              <p className="muted">
                Quadrature assumes a finite, smooth interval. Root finding needs
                opposite endpoint signs and checks the residual.
              </p>
            </section>
          </>
        ) : (
          <section className="empty-inspector">
            <Sigma size={28} />
            <h3>Select a Cartesian function</h3>
            <p>
              Point calculus and interval analysis apply to y = f(x). Polar and
              parametric curves remain available in the graph.
            </p>
          </section>
        )}
      </div>
      <div className="inspector-footer">
        <span className="live-dot" />
        Computed on your device
      </div>
    </aside>
  );
}
