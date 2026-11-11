# Graph animation

Open **Examples → Traveling wave**, then press **Play** below the graph. The curve changes because its expression is evaluated at the current time; no backend is required. Existing projects start paused and retain their original parameter definitions.

| Graph type | Example | Meaning |
| --- | --- | --- |
| Cartesian | `2 * sin(x - t)` | Traveling wave; `t` and `time` are the animation clock |
| Cartesian | `2 * sin(x) * cos(time)` | Standing wave |
| Polar | `(2 + sin(time)) * cos(3 * theta)` | Changing rose; `theta` (or legacy `t`) remains the angular parameter |
| Parametric | x: `3 * sin(3 * u + time)`; y: `3 * sin(2 * u)` | Changing Lissajous figure; `u` (or legacy `t`) remains the curve parameter |

All angles are in radians. Time is in seconds. A static expression remains static when Play is pressed.

## Timeline controls

- **Play / Pause:** start or freeze the displayed frame. Space also toggles playback outside inputs and buttons.
- **Restart:** pause and return to the beginning of the range.
- **Previous / Next frame:** move by one target-frame interval in simulation time. These controls appear on wide and mobile layouts; scrubbing works at every size.
- **Slider:** drag or use arrow keys to scrub. Releasing the slider or leaving it saves the chosen time.
- **Speed:** choose 0.25×–4×. Imported projects can retain other validated speeds from 0.1×–10×.
- **Timeline settings:** set start/end, jump to an exact time, choose Loop, Back and forth, or Play once, and choose a 15/30/60 fps target. Opening or changing settings pauses playback.

The time label belongs to the rendered frame. Actual frame rate depends on hardware, expression complexity, layer count and sampling quality. Reduce **Properties → Sampling** for heavier graphs. Switching to another browser tab pauses playback. Returning does not autoplay.

## Graph tools

**Trace selected curve** shows an approximate point on its sampled segments and crosshairs; it does not bridge discontinuity gaps. Click to send the traced x coordinate to Calculus. **Fit sampled curves** fits finite sampled geometry with padding; Cartesian sampling still uses the existing x domain, so this is not a global function-range solver. Near poles, large sampled values can produce a wide fitted range. **Equal axis scale** preserves geometric proportions. Each curve has color, width and solid/dashed/dotted style controls in Properties.

## Calculations, saving and export

Point evaluation, derivatives, tangent/derivative overlays and integration use the rendered time. An explicit calculation pauses playback, and its console record includes that time. Browser symbolic differentiation treats the time variable as constant with respect to x. The optional Python symbolic service has its existing separate grammar; the animation clock is a frontend feature.

JSON projects store the timeline settings and chosen time, but reopen paused. Old version-1 JSON files receive defaults; polar/parametric `t` retains its old meaning. Playback frames do not fill undo history. SVG/PNG/CSV exports freeze the current frame. CSV adds a `time` column and SVG metadata includes the animation settings. These are still-frame exports; video/GIF encoding and keyframes are not included.
