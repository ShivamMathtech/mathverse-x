import type { AnimationSettings } from "./types";

export interface ClockState { time: number; direction: 1 | -1; finished: boolean }
/** Elapsed seconds, independent of the display refresh rate or sampling latency. */
export function advanceTime(
  time: number, direction: 1 | -1, elapsed: number, settings: AnimationSettings,
): ClockState {
  const { start, end, speed, mode } = settings;
  const span = end - start;
  const current = Math.max(start, Math.min(end, time));
  const distance = Math.max(0, elapsed) * speed;
  if (mode === "once") {
    const next = Math.min(end, current + distance);
    return { time: next, direction: 1, finished: next >= end };
  }
  if (mode === "loop")
    return { time: start + ((current - start + distance) % span), direction: 1, finished: false };
  const phase = ((direction === 1 ? current - start : 2 * span - (current - start)) + distance) % (2 * span);
  return { time: start + (phase <= span ? phase : 2 * span - phase), direction: phase < span ? 1 : -1, finished: false };
}
