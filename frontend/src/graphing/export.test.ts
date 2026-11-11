import { expect, it } from "vitest";
import { serializeCSV } from "./export";
import { sampleProject } from "../mathematics/sampling";
import { freshProject } from "../state/project";
it("exports a consistent time snapshot and mathematically matching coordinates", () => {
  const project = freshProject();
  project.animation.time = 2.25;
  project.curves = [{ ...project.curves[0], expression: "sin(x - time)" }];
  const [header, ...lines] = serializeCSV(sampleProject({ project }), project).split("\r\n");
  expect(header).toBe("curve_id,kind,segment,x,y,time");
  expect(lines.length).toBeGreaterThan(100);
  for (const line of lines) {
    const fields = line.slice(1,-1).split('\",\"');
    const [x, y, time] = fields.slice(3).map(Number);
    expect(time).toBe(2.25); expect(y).toBeCloseTo(Math.sin(x - time), 12);
  }
});
