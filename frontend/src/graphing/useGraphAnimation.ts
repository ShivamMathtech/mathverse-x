import { useEffect, useRef, useState } from "react";
import { advanceTime } from "../mathematics/animation";
import type { Project, SampledCurve } from "../mathematics/types";
import { Sampler } from "../workers/sampler";

export function useGraphAnimation(
  project: Project, derivativeId: string | undefined,
  tangent: { id: string; x: number } | undefined,
  commitTime: (time: number) => void,
) {
  const [frame, setFrame] = useState<{ samples: SampledCurve[]; time: number }>({ samples: [], time: project.animation.time });
  const [playing, setPlaying] = useState(false);
  const [sampling, setSampling] = useState(true);
  const [error, setError] = useState("");
  const [fps, setFps] = useState(0);
  const displayed = useRef(frame);
  const commit = useRef(commitTime);
  commit.current = commitTime;
  const runtime = useRef({ time: project.animation.time, direction: 1 as 1 | -1, playing: false, revision: 0, resetClock: true });
  const wake = useRef(() => {});
  const settings = useRef(project.animation);
  settings.current = project.animation;

  function pause() {
    const r = runtime.current;
    r.playing = false;
    r.time = Math.max(settings.current.start, Math.min(settings.current.end, displayed.current.time));
    r.revision++;
    r.resetClock = true;
    setPlaying(false);
    commit.current(r.time);
    wake.current();
    return r.time;
  }
  function seek(time: number, persist = false) {
    const r = runtime.current, s = settings.current;
    r.playing = false;
    r.time = Math.max(s.start, Math.min(s.end, time));
    r.direction = 1;
    r.revision++;
    r.resetClock = true;
    setPlaying(false);
    if (persist) commit.current(r.time);
    wake.current();
  }
  function play() {
    const r = runtime.current, s = settings.current;
    if (s.mode === "once" && r.time >= s.end) r.time = s.start;
    r.playing = true;
    r.resetClock = true;
    r.revision++;
    setPlaying(true);
    wake.current();
  }
  function persist() { commit.current(runtime.current.time); }

  useEffect(() => {
    const r = runtime.current;
    r.playing = false;
    r.time = project.animation.time;
    r.direction = 1;
    r.revision++;
    r.resetClock = true;
    setPlaying(false);
  }, [project.animation]);

  useEffect(() => {
    const sampler = new Sampler();
    let active = true, inFlight = false, ready = false, raf: number | null = null;
    let lastClock = performance.now(), lastRequest = -Infinity, lastRevision = -1;
    let frames = 0, rateStart = performance.now(), commitEnd = false;
    setSampling(true);
    setError("");
    const schedule = () => {
      if (active && raf === null) raf = requestAnimationFrame(tick);
    };
    function tick(now: number) {
      raf = null;
      if (!active) return;
      const r = runtime.current;
      if (r.resetClock) { lastClock = now; rateStart = now; frames = 0; r.resetClock = false; }
      if (r.playing) {
        const next = advanceTime(r.time, r.direction, (now - lastClock) / 1000, project.animation);
        r.time = next.time; r.direction = next.direction;
        if (next.finished) { r.playing = false; setPlaying(false); commitEnd = true; r.revision++; }
      }
      lastClock = now;
      if (!inFlight && (!ready || lastRevision !== r.revision || (r.playing && now - lastRequest >= 1000 / project.animation.fps))) {
        inFlight = true;
        lastRequest = now;
        const time = r.time, revision = r.revision;
        void sampler.sample({ project, time, derivativeId, tangent }).then((samples) => {
          if (!active || revision !== runtime.current.revision) return;
          const next = { samples, time };
          displayed.current = next;
          setFrame(next);
          setError("");
          ready = true;
          lastRevision = revision;
          frames++;
          const elapsed = performance.now() - rateStart;
          if (elapsed >= 600) { setFps(Math.round(frames * 1000 / elapsed)); rateStart = performance.now(); frames = 0; }
          if (commitEnd) { commitEnd = false; commit.current(time); }
        }).catch((e: Error) => {
          if (!active || e.name === "AbortError") return;
          runtime.current.playing = false;
          setPlaying(false);
          setError(e.message);
          setFrame({ samples: [], time: displayed.current.time });
          ready = true;
          lastRevision = runtime.current.revision;
        }).finally(() => {
          inFlight = false;
          if (active) { if (ready) setSampling(false); schedule(); }
        });
      }
      if (r.playing) schedule();
    }
    wake.current = schedule;
    schedule();
    return () => {
      active = false;
      if (raf !== null) cancelAnimationFrame(raf);
      wake.current = () => {};
      sampler.dispose();
    };
  }, [project, derivativeId, tangent?.id, tangent?.x]);

  useEffect(() => {
    const hide = () => { if (document.hidden && runtime.current.playing) pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  return { ...frame, playing, sampling, error, fps, play, pause, seek, persist,
    toggle: () => runtime.current.playing ? pause() : play() };
}
