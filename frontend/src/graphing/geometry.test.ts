import { expect, it } from "vitest";
import { fitSamples, traceCurve } from "./geometry";
const view = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
it("traces along a segment in screen coordinates", () => {
  expect(traceCurve([[[0,0], [2,2]]], [1,0], view, 100, 100)).toEqual([0.5,0.5]);
});
it("never traces through discontinuity gaps", () => {
  expect(traceCurve([[[-3,0],[-2,0]], [[2,0],[3,0]]], [0,0], view, 100,100)).toEqual([-2,0]);
});
it("does not produce a marker for an empty or offscreen graph", () => {
  expect(traceCurve([], [0,0], view,100,100)).toBeNull();
  expect(traceCurve([[[20,20],[30,30]]], [0,0], view,100,100)).toBeNull();
});
it("fits finite sampled points with padding and handles horizontal curves", () => {
  const result = fitSamples([{id: "curve", segments: [[[-2,3],[4,3]]], evaluations: 2, latex: ""}])!;
  expect(result.xMin).toBeLessThan(-2); expect(result.xMax).toBeGreaterThan(4);
  expect(result.yMin).toBeLessThan(3); expect(result.yMax).toBeGreaterThan(3);
  expect(fitSamples([])).toBeNull();
});
