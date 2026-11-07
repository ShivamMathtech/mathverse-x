import { compileScalar } from "./expression";
import { numericalDerivative } from "./numerical";
import type {
  Curve,
  Point2,
  Project,
  SampledCurve,
  SampleRequest,
} from "./types";
export function sampleCurve(
  curve: Curve,
  project: Project,
  mode: "normal" | "derivative" = "normal",
): SampledCurve {
  let evaluations = 0;
  try {
    const variable =
      curve.kind === "cartesian" ? "x" : curve.kind === "polar" ? "theta" : "t";
    const first = compileScalar(curve.expression, project.parameters, variable);
    const second =
      curve.kind === "parametric"
        ? compileScalar(curve.expressionY, project.parameters, "t")
        : null;
    const [start, end] =
      curve.kind === "cartesian"
        ? [project.viewport.xMin, project.viewport.xMax]
        : [curve.tMin, curve.tMax];
    const ySpan = project.viewport.yMax - project.viewport.yMin,
      xSpan = project.viewport.xMax - project.viewport.xMin;
    function at(t: number): Point2 | null {
      if (++evaluations > 24000) return null;
      let v = first.evaluate(t);
      if (mode === "derivative") {
        try {
          v = numericalDerivative(first.evaluate, t).value;
        } catch {
          return null;
        }
      }
      if (!Number.isFinite(v)) return null;
      let point: Point2;
      if (curve.kind === "polar") point = [v * Math.cos(t), v * Math.sin(t)];
      else if (second) point = [v, second.evaluate(t)];
      else point = [t, v];
      return point.every(Number.isFinite) &&
        Math.abs(point[0]) < 1e12 &&
        Math.abs(point[1]) < 1e12
        ? point
        : null;
    }
    const output: (Point2 | null)[] = [];
    function refine(
      t0: number,
      t1: number,
      p0: Point2 | null,
      p1: Point2 | null,
      depth: number,
    ) {
      const tm = (t0 + t1) / 2,
        pm = at(tm);
      if (!p0 || !p1 || !pm) {
        if (depth < 4 && evaluations < 22000) {
          refine(t0, tm, p0, pm, depth + 1);
          refine(tm, t1, pm, p1, depth + 1);
        } else output.push(null, p1);
        return;
      }
      const error = Math.hypot(
        (pm[0] - (p0[0] + p1[0]) / 2) / xSpan,
        (pm[1] - (p0[1] + p1[1]) / 2) / ySpan,
      );
      const jump = Math.hypot((p1[0] - p0[0]) / xSpan, (p1[1] - p0[1]) / ySpan);
      if ((error > 0.0015 || jump > 0.35) && depth < 8 && evaluations < 22000) {
        refine(t0, tm, p0, pm, depth + 1);
        refine(tm, t1, pm, p1, depth + 1);
      } else if (error > 0.04 || jump > 1.5) output.push(null, p1);
      else output.push(p1);
    }
    const count = Math.max(80, Math.min(1600, project.resolution));
    let prev = at(start);
    output.push(prev);
    for (let i = 1; i <= count; i++) {
      const t0 = start + ((end - start) * (i - 1)) / count,
        t1 = start + ((end - start) * i) / count,
        next = at(t1);
      refine(t0, t1, prev, next, 0);
      prev = next;
    }
    const segments: Point2[][] = [];
    let current: Point2[] = [];
    for (const p of output) {
      if (p) current.push(p);
      else {
        if (current.length > 1) segments.push(current);
        current = [];
      }
    }
    if (current.length > 1) segments.push(current);
    return {
      id: curve.id + (mode === "derivative" ? ":derivative" : ""),
      segments,
      latex: first.latex,
      evaluations,
      ...(!segments.length
        ? { error: "No finite real curve is visible in this domain." }
        : {}),
    };
  } catch (error) {
    return {
      id: curve.id,
      segments: [],
      latex: "",
      error: error instanceof Error ? error.message : String(error),
      evaluations,
    };
  }
}
export function sampleProject({
  project,
  derivativeId,
  tangent,
}: SampleRequest): SampledCurve[] {
  const samples = project.curves
    .filter((c) => c.visible)
    .map((c) => sampleCurve(c, project));
  const derived = project.curves.find(
    (c) => c.id === derivativeId && c.kind === "cartesian" && c.visible,
  );
  if (derived) samples.push(sampleCurve(derived, project, "derivative"));
  const target = project.curves.find(
    (c) => c.id === tangent?.id && c.kind === "cartesian" && c.visible,
  );
  if (target && tangent) {
    try {
      const f = compileScalar(target.expression, project.parameters).evaluate;
      const y = f(tangent.x),
        slope = numericalDerivative(f, tangent.x).value;
      if (Number.isFinite(y))
        samples.push({
          id: target.id + ":tangent",
          segments: [
            [
              [
                project.viewport.xMin,
                y + slope * (project.viewport.xMin - tangent.x),
              ],
              [
                project.viewport.xMax,
                y + slope * (project.viewport.xMax - tangent.x),
              ],
            ],
          ],
          latex: "",
          evaluations: 5,
        });
    } catch {
      /* Selected computation reports invalid points; omit an undefined overlay. */
    }
  }
  return samples;
}
