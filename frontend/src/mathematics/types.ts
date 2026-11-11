export type Point2 = [number, number];
export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
export type CurveKind = "cartesian" | "polar" | "parametric";
export interface Curve {
  id: string;
  kind: CurveKind;
  expression: string;
  expressionY: string;
  color: string;
  visible: boolean;
  tMin: number;
  tMax: number;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
}
export interface AnimationSettings {
  time: number;
  start: number;
  end: number;
  speed: number;
  mode: "loop" | "once" | "pingpong";
  fps: 15 | 30 | 60;
}
export interface Project {
  schema: "mathverse-x";
  version: 1;
  name: string;
  curves: Curve[];
  viewport: Viewport;
  parameters: { a: number; b: number; c: number };
  selectedId: string;
  resolution: number;
  grid: boolean;
  axes: boolean;
  animation: AnimationSettings;
}
export interface SampledCurve {
  id: string;
  segments: Point2[][];
  latex: string;
  error?: string;
  evaluations: number;
}
export interface NumericResult {
  value: number;
  errorEstimate?: number;
  iterations?: number;
  residual?: number;
  method: string;
}
export interface SampleRequest {
  project: Project;
  time?: number;
  derivativeId?: string;
  tangent?: { id: string; x: number };
}
export type ComputeRequest =
  | { type: "sample"; payload: SampleRequest }
  | {
      type: "numeric";
      operation: "evaluate" | "derivative" | "integral" | "root";
      expression: string;
      parameters: Project["parameters"];
      time?: number;
      x: number;
      lo: number;
      hi: number;
    }
  | { type: "symbolicDerivative"; expression: string };
export type ComputeResult = SampledCurve[] | NumericResult | string;

// Extension contracts for future phases. No unimplemented renderers are exposed in the UI.
export interface NDObject {
  id: string;
  dimension: number;
  points: number[][];
  edges: [number, number][];
  cells?: number[][];
  metadata: Record<string, string>;
}
export type ProjectionSpec =
  | {
      kind: "linear";
      sourceDimension: number;
      targetDimension: number;
      matrix: number[][];
      origin: number[];
    }
  | {
      kind: "perspective" | "stereographic";
      sourceDimension: number;
      targetDimension: number;
      center: number[];
      focalDistance: number;
      near: number;
      far: number;
    };
export interface CoordinateSystem {
  id: string;
  dimension: number;
  toCartesian: (point: number[]) => number[];
  fromCartesian?: (point: number[]) => number[];
  jacobian?: (point: number[]) => number[][];
}
export type MathematicalObject =
  | { kind: "curve2d"; curve: Curve }
  | { kind: "explicitSurface"; expression: string; domain: [number, number][] }
  | {
      kind: "implicit";
      expression: string;
      dimension: number;
      domain: [number, number][];
    }
  | {
      kind: "parametric";
      expressions: string[];
      parameterDomains: [number, number][];
    }
  | {
      kind: "vectorField";
      components: string[];
      dimension: number;
      domain: [number, number][];
    }
  | { kind: "pointCloud"; data: NDObject };
