import type { Curve, Project, Viewport } from "../mathematics/types";
export const palette = ["#83cdbd", "#e8b77a", "#a7a7ec", "#ed91a7", "#89bfe8"];
export const defaultView: Viewport = {
  xMin: -8,
  xMax: 8,
  yMin: -4.5,
  yMax: 4.5,
};
export function newCurve(index = 0): Curve {
  return {
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint32Array(4)), (v) =>
            v.toString(16),
          ).join("-"),
    kind: "cartesian",
    expression: "sin(x)",
    expressionY: "sin(t)",
    color: palette[index % palette.length],
    visible: true,
    tMin: 0,
    tMax: 2 * Math.PI,
  };
}
export function freshProject(): Project {
  const first = { ...newCurve(), expression: "a * sin(b * x) + c" };
  const second = { ...newCurve(1), expression: "0.12 * x^2 - 1.5" };
  return {
    schema: "mathverse-x",
    version: 1,
    name: "Wave & parabola",
    curves: [first, second],
    viewport: { ...defaultView },
    parameters: { a: 2, b: 1, c: 0 },
    selectedId: first.id,
    resolution: 480,
    grid: true,
    axes: true,
  };
}
function finite(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}
export function validViewport(value: unknown): value is Viewport {
  if (!value || typeof value !== "object") return false;
  const v = value as Viewport;
  return (
    [v.xMin, v.xMax, v.yMin, v.yMax].every((x) => finite(x, -1e7, 1e7)) &&
    v.xMax - v.xMin >= 1e-6 &&
    v.yMax - v.yMin >= 1e-6
  );
}
export function validateProject(value: unknown): Project {
  if (!value || typeof value !== "object")
    throw new Error("Not a MATHVERSE X project.");
  const p = value as Project;
  if (p.schema !== "mathverse-x" || p.version !== 1)
    throw new Error(
      "Unsupported project format or version. Expected MATHVERSE X version 1.",
    );
  if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 80)
    throw new Error("Project name must have 1–80 characters.");
  if (!Array.isArray(p.curves) || p.curves.length > 20)
    throw new Error("A project supports at most 20 curves.");
  const ids = new Set<string>();
  for (const c of p.curves) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !/^[-a-zA-Z0-9_]{1,80}$/.test(c.id) ||
      ids.has(c.id) ||
      !["cartesian", "polar", "parametric"].includes(c.kind)
    )
      throw new Error("Invalid curve identity or type.");
    ids.add(c.id);
    if (
      typeof c.expression !== "string" ||
      c.expression.length > 300 ||
      typeof c.expressionY !== "string" ||
      c.expressionY.length > 300
    )
      throw new Error("Expressions must have at most 300 characters.");
    if (
      typeof c.color !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(c.color) ||
      typeof c.visible !== "boolean"
    )
      throw new Error("Invalid curve appearance.");
    if (
      !finite(c.tMin, -1e5, 1e5) ||
      !finite(c.tMax, -1e5, 1e5) ||
      c.tMax <= c.tMin
    )
      throw new Error("Invalid parameter domain.");
  }
  if (!validViewport(p.viewport))
    throw new Error(
      "Invalid viewport. Bounds must be ordered, finite and within ±10,000,000.",
    );
  if (
    !p.parameters ||
    !["a", "b", "c"].every((k) =>
      finite(p.parameters[k as keyof typeof p.parameters], -10, 10),
    )
  )
    throw new Error("Parameters must be between -10 and 10.");
  if (
    !finite(p.resolution, 80, 1600) ||
    !Number.isInteger(p.resolution) ||
    typeof p.grid !== "boolean" ||
    typeof p.axes !== "boolean"
  )
    throw new Error("Invalid graph settings.");
  return {
    schema: "mathverse-x",
    version: 1,
    name: p.name,
    curves: p.curves.map((c) => ({
      id: c.id,
      kind: c.kind,
      expression: c.expression,
      expressionY: c.expressionY,
      color: c.color,
      visible: c.visible,
      tMin: c.tMin,
      tMax: c.tMax,
    })),
    viewport: { ...p.viewport },
    parameters: { a: p.parameters.a, b: p.parameters.b, c: p.parameters.c },
    selectedId: ids.has(p.selectedId) ? p.selectedId : (p.curves[0]?.id ?? ""),
    resolution: p.resolution,
    grid: p.grid,
    axes: p.axes,
  };
}
export function parseProject(text: string) {
  if (text.length > 250000)
    throw new Error("Project file exceeds the 250 KB limit.");
  try {
    return validateProject(JSON.parse(text));
  } catch (e) {
    if (e instanceof SyntaxError)
      throw new Error("This file is not valid JSON.");
    throw e;
  }
}
export const examples = [
  {
    name: "Wave & parabola",
    label: "Functions & parameters",
    kind: "cartesian" as const,
    expression: "a * sin(b * x) + c",
    secondary: "0.12 * x^2 - 1.5",
    a: 2,
    view: defaultView,
  },
  {
    name: "Rose curve",
    label: "Polar coordinates",
    kind: "polar" as const,
    expression: "a * cos(3 * theta)",
    a: 3,
    view: { xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
  },
  {
    name: "Lissajous figure",
    label: "Parametric motion",
    kind: "parametric" as const,
    expression: "3 * sin(3 * t + a)",
    expressionY: "3 * sin(2 * t)",
    a: 1.5,
    view: { xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
  },
  {
    name: "Damped oscillation",
    label: "Exponential envelope",
    kind: "cartesian" as const,
    expression: "3 * exp(-0.12 * x^2) * cos(b * x)",
    a: 1,
    view: defaultView,
  },
  {
    name: "Discontinuities",
    label: "Domain-aware sampling",
    kind: "cartesian" as const,
    expression: "1 / x",
    secondary: "tan(x)",
    a: 1,
    view: defaultView,
  },
  {
    name: "Piecewise function",
    label: "Conditional expressions",
    kind: "cartesian" as const,
    expression: "x < 0 ? -x : x^2 / 3",
    a: 1,
    view: defaultView,
  },
];
export function exampleProject(index: number): Project {
  const e = examples[index],
    p = freshProject();
  const c = {
    ...newCurve(),
    kind: e.kind,
    expression: e.expression,
    expressionY: e.expressionY ?? "sin(t)",
  };
  return {
    ...p,
    name: e.name,
    curves: [
      c,
      ...(e.secondary ? [{ ...newCurve(1), expression: e.secondary }] : []),
    ],
    selectedId: c.id,
    parameters: { a: e.a, b: 1, c: 0 },
    viewport: { ...e.view },
  };
}
