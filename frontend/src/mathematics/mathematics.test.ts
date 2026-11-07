import { describe, it, expect } from "vitest";
import { compileScalar, differentiate } from "./expression";
import { integrate, numericalDerivative, root } from "./numerical";
import { sampleCurve } from "./sampling";
import { freshProject, parseProject, validateProject } from "../state/project";
describe("scalar expression boundary", () => {
  it("evaluates math notation and parameters", () => {
    expect(
      compileScalar("a*sin(x)+2^3", { a: 2 }).evaluate(Math.PI / 2),
    ).toBeCloseTo(10, 12);
  });
  it("supports conditional expressions", () => {
    const f = compileScalar("x < 0 ? -x : x^2").evaluate;
    expect(f(-2)).toBe(2);
    expect(f(3)).toBe(9);
  });
  it.each([
    "x=2",
    "import(2)",
    "evaluate(2)",
    "x.constructor",
    "[1,2]",
    "unknown(x)",
    '"abc"',
    "5!",
    "f(x)=x",
  ])("rejects unsafe/unsupported input %s", (s) => {
    expect(() => compileScalar(s)).toThrow();
  });
  it("rejects oversized expressions", () =>
    expect(() => compileScalar("1+".repeat(160) + "1")).toThrow());
  it("rejects wrong independent variables", () =>
    expect(() => compileScalar("sin(t)", {}, "x")).toThrow());
  it("returns nonfinite for complex values", () =>
    expect(compileScalar("sqrt(x)").evaluate(-1)).toBeNaN());
  it("symbolically differentiates using a known analytical case", () => {
    expect(compileScalar(differentiate("x^2")).evaluate(7)).toBe(14);
  });
});
describe("numerical reference cases", () => {
  it("differentiates x²", () =>
    expect(numericalDerivative((x) => x * x, 3).value).toBeCloseTo(6, 8));
  it("integrates a polynomial", () =>
    expect(integrate((x) => x * x, 0, 1).value).toBeCloseTo(1 / 3, 10));
  it("integrates sine", () =>
    expect(integrate(Math.sin, 0, Math.PI).value).toBeCloseTo(2, 8));
  it("reverses integral orientation", () =>
    expect(integrate((x) => x * x, 1, 0).value).toBeCloseTo(-1 / 3, 10));
  it("rejects a sampled singularity", () =>
    expect(() => integrate((x) => 1 / x, -1, 1)).toThrow(/not finite/));
  it("finds sqrt(2) with a small residual", () => {
    const r = root((x) => x * x - 2, 1, 2);
    expect(r.value).toBeCloseTo(Math.sqrt(2), 8);
    expect(r.residual).toBeLessThan(1e-9);
  });
  it("rejects a false sign change at a pole", () =>
    expect(() => root((x) => 1 / (x - 0.37), 0, 1)).toThrow());
  it("rejects an unbracketed root", () =>
    expect(() => root((x) => x * x + 1, -1, 1)).toThrow(/opposite/));
});
describe("sampling and discontinuities", () => {
  it("samples a polar circle with constant radius", () => {
    const p = freshProject(),
      c = { ...p.curves[0], kind: "polar" as const, expression: "2" };
    const s = sampleCurve(c, p);
    expect(s.error).toBeUndefined();
    expect(s.segments.flat().length).toBeGreaterThan(100);
    for (const [x, y] of s.segments.flat())
      expect(Math.hypot(x, y)).toBeCloseTo(2, 10);
  });
  it("samples a parametric unit circle", () => {
    const p = freshProject(),
      c = {
        ...p.curves[0],
        kind: "parametric" as const,
        expression: "cos(t)",
        expressionY: "sin(t)",
      };
    for (const [x, y] of sampleCurve(c, p).segments.flat())
      expect(x * x + y * y).toBeCloseTo(1, 10);
  });
  it("does not bridge the 1/x pole", () => {
    const p = freshProject();
    const s = sampleCurve({ ...p.curves[0], expression: "1/x" }, p);
    expect(s.segments.length).toBeGreaterThanOrEqual(2);
    for (const seg of s.segments)
      expect(!(seg.some((v) => v[0] < 0) && seg.some((v) => v[0] > 0))).toBe(
        true,
      );
  });
  it("does not bridge a tan pole", () => {
    const p = freshProject();
    const s = sampleCurve({ ...p.curves[0], expression: "tan(x)" }, p);
    for (const seg of s.segments)
      expect(
        !(
          seg.some((v) => v[0] < Math.PI / 2) &&
          seg.some((v) => v[0] > Math.PI / 2)
        ),
      ).toBe(true);
  });
  it("reports invalid syntax without pretending to draw", () => {
    const p = freshProject();
    const s = sampleCurve({ ...p.curves[0], expression: "sin(" }, p);
    expect(s.error).toBeTruthy();
    expect(s.segments).toHaveLength(0);
  });
});
describe("portable projects", () => {
  it("round-trips without losing parameters and bounds", () => {
    const p = freshProject();
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("rejects a future schema version", () =>
    expect(() => validateProject({ ...freshProject(), version: 2 })).toThrow());
  it("rejects reversed bounds", () =>
    expect(() =>
      validateProject({
        ...freshProject(),
        viewport: { xMin: 4, xMax: 1, yMin: -2, yMax: 2 },
      }),
    ).toThrow());
  it("rejects excessive layers", () => {
    const p = freshProject();
    expect(() =>
      validateProject({
        ...p,
        curves: Array.from({ length: 21 }, (_, i) => ({
          ...p.curves[0],
          id: String(i),
        })),
      }),
    ).toThrow();
  });
  it("rejects invalid colors and duplicate ids", () => {
    const p = freshProject();
    expect(() =>
      validateProject({ ...p, curves: [{ ...p.curves[0], color: "url(x)" }] }),
    ).toThrow();
    expect(() =>
      validateProject({ ...p, curves: [p.curves[0], p.curves[0]] }),
    ).toThrow();
  });
  it("rejects out-of-budget parameters", () =>
    expect(() =>
      validateProject({
        ...freshProject(),
        parameters: { a: 100, b: 1, c: 0 },
      }),
    ).toThrow());
});
