import { useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, SlidersHorizontal, Waves } from "lucide-react";
import type { AnimationSettings } from "../mathematics/types";
import { NumberField } from "./NumberField";

interface Props {
  settings: AnimationSettings;
  time: number;
  playing: boolean;
  fps: number;
  toggle: () => void;
  seek: (time: number, persist?: boolean) => void;
  persist: () => void;
  configure: (settings: AnimationSettings) => void;
  example: () => void;
  notify: (message: string) => void;
}
export function Timeline(p: Props) {
  const [expanded, setExpanded] = useState(false);
  const s = p.settings;
  function change(patch: Partial<AnimationSettings>) {
    const next = { ...s, ...patch };
    if (next.end - next.start < 0.001) {
      p.notify("Timeline end must be at least 0.001 seconds after the start."); return;
    }
    next.time = Math.max(next.start, Math.min(next.end, p.time));
    p.configure(next);
  }
  return <section className={`timeline ${p.playing ? "is-playing" : ""}`} aria-label="Graph animation timeline">
    <div className="timeline-heading">
      <span><Waves size={14} /> TIME ANIMATION</span>
      <span className="timeline-rate">{p.playing ? `${p.fps || "…"} fps` : "Paused"}</span>
      <button className="timeline-demo" onClick={p.example}>Try a traveling wave ↗</button>
    </div>
    <div className="timeline-transport">
      <button className="timeline-play" aria-label={p.playing ? "Pause animation" : "Play animation"} title="Play / pause (Space outside inputs)" onClick={p.toggle}>
        {p.playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      <button aria-label="Restart animation" title="Return to start" onClick={() => p.seek(s.start, true)}><RotateCcw size={15} /></button>
      <button className="timeline-step" aria-label="Previous frame" onClick={() => p.seek(p.time - 1 / s.fps, true)}><SkipBack size={14} /></button>
      <button className="timeline-step" aria-label="Next frame" onClick={() => p.seek(p.time + 1 / s.fps, true)}><SkipForward size={14} /></button>
      <output className="timeline-time" aria-label="Rendered graph time">t = {p.time.toFixed(3)}<small>s</small></output>
      <div className="timeline-track">
        <input type="range" aria-label="Animation time" min={s.start} max={s.end} step="any" value={Math.max(s.start, Math.min(s.end, p.time))}
          onChange={(e) => p.seek(Number(e.target.value))} onPointerUp={p.persist} onKeyUp={p.persist} onBlur={p.persist} />
        <div><span>{Number(s.start.toFixed(3))} s</span><span>{Number(s.end.toFixed(3))} s</span></div>
      </div>
      <select aria-label="Playback speed" value={s.speed} onChange={(e) => change({ speed: Number(e.target.value) })}>
        {[0.25, 0.5, 1, 1.5, 2, 4, ...([0.25, 0.5, 1, 1.5, 2, 4].includes(s.speed) ? [] : [s.speed])].sort((a,b) => a-b).map(speed => <option value={speed} key={speed}>{speed}×</option>)}
      </select>
      <button aria-label="Timeline settings" aria-expanded={expanded} onClick={() => { if (!expanded && p.playing) p.toggle(); setExpanded(!expanded); }}><SlidersHorizontal size={16} /></button>
    </div>
    <p className="timeline-help">Use <code>sin(x - t)</code> for motion. <code>time</code> works in every graph type.</p>
    {expanded && <div className="timeline-settings">
      <div className="timeline-settings-title"><strong>Timeline settings</strong><button onClick={() => setExpanded(false)}>Done</button></div>
      <div className="field-grid">
        <NumberField label="Start time" value={s.start} min={-1e5} max={1e5} onChange={start => change({ start })} />
        <NumberField label="End time" value={s.end} min={-1e5} max={1e5} onChange={end => change({ end })} />
        <NumberField label="Jump to time" value={p.time} min={s.start} max={s.end} onChange={time => p.seek(time, true)} />
        <label className="stack-label">Playback mode<select aria-label="Playback mode" value={s.mode} onChange={e => change({ mode: e.target.value as AnimationSettings["mode"] })}>
          <option value="loop">Loop</option><option value="pingpong">Back and forth</option><option value="once">Play once</option>
        </select></label>
        <label className="stack-label">Target frame rate<select aria-label="Target frame rate" value={s.fps} onChange={e => change({ fps: Number(e.target.value) as AnimationSettings["fps"] })}>
          {[15, 30, 60].map(fps => <option value={fps} key={fps}>{fps} fps</option>)}
        </select></label>
      </div>
      <p className="muted">Settings pause playback. Frame rate depends on curve complexity. Parametric curves use u (or t) for the curve parameter and time for animation.</p>
    </div>}
  </section>;
}
