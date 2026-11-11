import { describe, expect, it } from "vitest";
import { advanceTime } from "./animation";
import { compileScalar, differentiate } from "./expression";
import { sampleCurve, sampleProject } from "./sampling";
import { defaultAnimation, freshProject, parseProject, validateProject } from "../state/project";
import { integrate } from "./numerical";

describe("time-dependent mathematics", () => {
  it("moves a traveling wave by its phase at independent times", () => {
    const p = freshProject(), c = { ...p.curves[0], expression: "sin(x - t)" };
    for (const time of [0, Math.PI / 2, 4.25]) {
      const samples = sampleCurve(c, p, "normal", time);
      expect(samples.error).toBeUndefined();
      for (const [x, y] of samples.segments.flat()) expect(y).toBeCloseTo(Math.sin(x - time), 12);
    }
  });
  it("keeps cached expressions isolated between parameter and time values", () => {
    const a = compileScalar("a*x + time + t", { a: 2 }, "x", 3);
    const b = compileScalar("a*x + time + t", { a: 5 }, "x", 7);
    expect(a.evaluate(4)).toBe(14); expect(b.evaluate(4)).toBe(34);
    expect(a.evaluate(4)).toBe(14);
  });
  it("separates a parametric coordinate from time, preserving legacy t", () => {
    const p = freshProject();
    for (const variable of ["u", "t"]) {
      const c = { ...p.curves[0], kind: "parametric" as const, expression: `cos(${variable}) + time`, expressionY: `sin(${variable})` };
      const sampled = sampleCurve(c, p, "normal", 3);
      expect(sampled.error).toBeUndefined();
      for (const [x, y] of sampled.segments.flat()) expect((x - 3) ** 2 + y ** 2).toBeCloseTo(1, 11);
    }
  });
  it("keeps polar t as the theta alias and supplies time independently", () => {
    expect(compileScalar("t + theta + time", {}, "theta", 5).evaluate(2)).toBe(9);
    const p = freshProject(), c = { ...p.curves[0], kind: "polar" as const, expression: "2 + sin(time)" };
    for (const [x, y] of sampleCurve(c, p, "normal", Math.PI / 2).segments.flat()) expect(Math.hypot(x,y)).toBeCloseTo(3, 10);
  });
  it("rejects curve parameters used in the wrong coordinate system", () => {
    expect(() => compileScalar("x + time", {}, "t", 2)).toThrow();
    expect(() => compileScalar("u + time", {}, "x", 2)).toThrow();
  });
  it("uses the displayed time for derivative and tangent overlays", () => {
    const p = freshProject(); p.curves = [{ ...p.curves[0], expression: "x^2 + t*x" }];
    const id = p.curves[0].id;
    const samples = sampleProject({ project: p, time: 2, derivativeId: id, tangent: { id, x: 1 } });
    for (const [x,y] of samples.find(s => s.id.endsWith(":derivative"))!.segments.flat()) expect(y).toBeCloseTo(2*x + 2, 5);
    for (const [x,y] of samples.find(s => s.id.endsWith(":tangent"))!.segments.flat()) expect(y).toBeCloseTo(4*x - 1, 5);
    expect(compileScalar(differentiate("x^2 + t*x"), {}, "x", 2).evaluate(1)).toBe(4);
    expect(integrate(compileScalar("x + time", {}, "x", 2).evaluate, 0, 1).value).toBeCloseTo(2.5, 10);
  });
  it("does not join segments across a moving pole", () => {
    const p = freshProject(), pole = 0.37;
    const s = sampleCurve({ ...p.curves[0], expression: "1 / (x - t)" }, p, "normal", pole);
    expect(s.segments.length).toBeGreaterThan(1);
    for (const segment of s.segments) expect(segment.some(([x]) => x < pole) && segment.some(([x]) => x > pole)).toBe(false);
  });
});

describe("elapsed-time playback", () => {
  const settings = { ...defaultAnimation, start: 0, end: 10 };
  it("advances by elapsed seconds and playback speed", () => {
    expect(advanceTime(2, 1, 0.5, { ...settings, speed: 2 }).time).toBe(3);
    let time = 0;
    for (let i = 0; i < 30; i++) time = advanceTime(time, 1, 1/30, settings).time;
    expect(time).toBeCloseTo(advanceTime(0,1,1,settings).time, 12);
  });
  it("wraps multiple loops including nonzero starting times", () => {
    expect(advanceTime(4,1,22,{ ...settings, start: 2, end: 7 }).time).toBe(6);
    expect(advanceTime(10,1,0,settings).time).toBe(0);
  });
  it("stops once at the exact end", () => {
    expect(advanceTime(9,1,5,{ ...settings, mode: "once" })).toEqual({ time: 10, direction: 1, finished: true });
  });
  it("reflects at both ends and handles a long frame", () => {
    const s = { ...settings, mode: "pingpong" as const };
    expect(advanceTime(9,1,3,s)).toEqual({ time: 8, direction: -1, finished: false });
    expect(advanceTime(1,-1,3,s)).toEqual({ time: 2, direction: 1, finished: false });
    expect(advanceTime(0,1,47,s)).toEqual({ time: 7, direction: 1, finished: false });
  });
  it("does not advance for a negative clock delta", () => expect(advanceTime(3,1,-4,settings).time).toBe(3));
});

describe("timeline project compatibility", () => {
  it("restores old projects without changing legacy curves", () => {
    const p = freshProject();
    const { animation: _animation, ...old } = p;
    const legacy = { ...old, curves: old.curves.map(({lineWidth: _w, lineStyle: _s, ...curve}) => curve) };
    expect(parseProject(JSON.stringify(legacy))).toEqual(p);
  });
  it("round-trips the frame, playback settings and line styles", () => {
    const p = freshProject();
    p.animation = { time: 3, start: -2, end: 12, speed: 2, fps: 60, mode: "pingpong" };
    p.curves[0].lineStyle = "dashed"; p.curves[0].lineWidth = 4;
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it.each([{ end: 0 }, { time: -1 }, { speed: 0 }, { time: NaN }, { fps: 90 }, { mode: "invalid" }, { start: 1e8 }])("rejects malformed timeline %j", (patch) => {
    const p = freshProject();
    expect(() => validateProject({ ...p, animation: { ...p.animation, ...patch } })).toThrow(/timeline/i);
  });
  it("rejects unsupported line styles and widths", () => {
    const p = freshProject();
    expect(() => validateProject({ ...p, curves: [{ ...p.curves[0], lineStyle: "url(x)" }] })).toThrow();
    expect(() => validateProject({ ...p, curves: [{ ...p.curves[0], lineWidth: 300 }] })).toThrow();
  });
});
