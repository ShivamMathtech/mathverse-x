# MATHVERSE X architecture

Repository: `mathverse-x`. Current implementation: v0.2.0, Phase 1 plus animated 2D graphs.

## Boundaries

React/TypeScript owns the workspace and accessible controls. Zustand stores a versioned project and bounded undo history. A dedicated Web Worker parses and evaluates expressions, samples curves and executes numerical methods. The SVG renderer only receives numerical points; it never decides mathematical results. Browser storage and portable JSON work without a server. The optional FastAPI service provides authenticated, time-limited SymPy operations. It is deployed separately from the static Vercel frontend.

The deployment unit is the repository root. npm workspaces keep frontend dependencies in one lockfile. `npm run build` produces `frontend/dist`. Vercel serves those static assets; frontend startup does not depend on an API request.

## Mathematical contracts

`frontend/src/mathematics/types.ts` defines Cartesian, polar and parametric curves, domains, sampled segments and numerical diagnostics. The generalized `NDObject` uses points of an explicit dimension plus indexed topology. A `ProjectionSpec` records source and target dimensions, a linear map or nonlinear method, and clipping parameters. A `CoordinateSystem` describes forward/inverse transforms and optional Jacobians. These contracts establish extension points; their presence does not imply an implemented 3D or ND renderer.

All scalar evaluations must return finite real numbers. Complex/nonfinite values break curve segments. Parse failures are visible. Expressions are restricted to numeric operators, known variables, constants and a bounded function allowlist. No assignment, property access, scripting or arbitrary evaluation is supported. Calculations run in a cancellable worker with a timeout and sample budget.

## Difficult engineering work

1. Domain topology: adaptive sampling is a heuristic, not proof of continuity. Detecting every singularity in an arbitrary expression is undecidable. Gaps must be preserved and numerical solvers must reject sampled nonfinite domains.
2. Implicit geometry: robust contour/isosurface extraction needs ambiguity handling and manifold tests before mesh exports are credible.
3. 4D slices: rotate in coordinate planes, intersect cells with an oriented hyperplane, deduplicate vertices, then reconstruct topology. Edge intersection alone is not a valid general solid slice.
4. Projection singularities: clip against near planes and stereographic poles; never hide divisions by zero with arbitrary denominators.
5. Symbolic execution: parsing is a separate trust boundary. Expensive symbolic jobs run in disposable child processes with strict timeouts and bounded concurrency.
6. Scientific reliability: independent analytical cases and residuals are essential; a visually plausible curve is insufficient validation.

## Phase 1 data flow

An expression edit updates a project → the sampling hook sends a serializable request → a worker validates and compiles expressions → samples and diagnostics return → SVG renders them. Outdated jobs are cancelled. Viewport changes resample. Calculus actions pause playback and use the selected Cartesian layer, current parameters and the rendered time. JSON import validates schema and bounds before it replaces project state. A successful save records the complete project, never credentials.

## Storage and security

Browser localStorage is best-effort recovery, not a backup; quota failures are shown. Download JSON for durable backups. No user account, shared cloud project store or multi-user authorization exists in v0.1. The optional Python API uses a user-supplied bearer token kept only in page memory. Never place API secrets in a VITE_ environment variable. CORS uses an explicit origin list. The service has no arbitrary Python evaluation and no persistent project data.

## Extension strategy

Add new graph-object discriminated unions, then pure numerical kernels and tests, worker messages, renderer and inspector controls. Add capability flags only after features have a working implementation. Desktop/Tauri, SQLite project management, MathLive, WebGL rendering and plugin isolation belong to later phases. Do not ship disabled placeholder workspaces.

## Time-driven rendering

`useGraphAnimation` advances an elapsed-time clock with requestAnimationFrame. It keeps one frame in flight through a reused worker; it never queues one worker per display frame. The time label is committed together with its sampled geometry. Slower devices skip intermediate times, and the UI reports observed throughput instead of promising the target frame rate. A revision invalidates a pending frame after seeking or pausing. Project/overlay changes dispose the old worker, and an eight-second deadline terminates stuck work. Compiled expression programs use a bounded 80-entry cache with a separate variable scope per evaluation context.

Runtime playback does not create undo entries or write localStorage each frame. Pause, seek completion, once-mode completion and explicit saves persist the time; settings and line styling are part of project JSON. Playback is never automatically restored. Page visibility changes pause playback and avoid a background-tab time jump. `time` is always the clock, `t` aliases the clock only for Cartesian curves, and `u` aliases the existing parametric `t`.
