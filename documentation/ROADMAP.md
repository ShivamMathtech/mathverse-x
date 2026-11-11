# Implementation roadmap

## Phase 1 — Foundation (this delivery)

Target: a usable, independently deployable scientific graphing workspace.

- React + strict TypeScript workspace, dark/light appearance, keyboard actions.
- Expression layers; Cartesian, parametric and polar curves; real computation.
- Worker sampling with discontinuity-aware segmentation, cancellation and error reporting.
- Pan/zoom, axis inspection, parameter sliders, derivative and tangent overlays.
- Numerical integration with an error estimate, central differentiation and bracketed root finding.
- Local project recovery, save/open JSON with version validation, examples and undo/redo.
- SVG/PNG and sampled CSV exports.
- Optional authenticated SymPy API, test suite, Windows scripts and Vercel configuration.

Acceptance: production build; analytical numerical tests; project round-trip and invalid-input tests; API authentication, parser, timeout and operation tests; browser interaction checks where infrastructure permits.

## v0.2 — Animated 2D graph studio (implemented)

- Time-driven Cartesian, polar and parametric curves; legacy parameter aliases retained.
- Timeline playback, scrubbing, stepping, speed, bounds and loop/once/back-and-forth modes.
- Reused computation worker, bounded expression compilation cache and one frame in flight.
- Sampled curve tracing, fit to sampled geometry, minor grid and line styling.
- Time-aware calculus, CSV/SVG metadata, compatible project migration and animated examples.
- Keyframes and video encoding remain future work.

## Phase 2 — 3D visualization

Add Three.js/React Three Fiber; surfaces z=f(x,y); parametric space curves/surfaces; orbit and orthographic cameras; mesh coloring; cylindrical/spherical conversion; independently validated marching cubes. Test sphere radius, mesh indices, normal directions and undefined-domain holes. Export OBJ only after geometry validation.

## Phase 3 — Projection engine

Implement matrix algebra and orthographic, perspective, oblique, isometric and custom linear maps; explicit clipping contracts. Build Projection Lab with comparisons and matrix export. Validate basis images, rank, distance relationships and known camera cases.

## Phase 4 — 4D and ND

Tesseract and simplex topology; six coordinate-plane rotation controls; generalized hypercube data; oriented 4D hyperplane slicing; hyperspheres. Validate orthogonality, determinant +1, distance preservation and known slice topology. Set dimension and cell-count budgets.

## Phase 5 — Computational mathematics

Extend the small SymPy API into richer calculus and linear algebra. Add SciPy roots, quadrature and ODE solvers with tolerances/residuals. Build vector/tensor labs with analytical divergence/curl cases. Add authenticated persistent projects and migrations only with a defined multi-user security model.

## Phase 6 — Advanced visualization

Complex domain coloring, direction fields, coupled ODE phase portraits, animation keyframes, CSV/NumPy data import and PCA; then other reduction methods. Distinguish geometric projection from learned embeddings. Compare all solvers against independent reference cases.

## Phase 7 — Production and desktop

Performance profiles, stress tests, a11y review, worker memory budgets, full browser suite, recovery, retention and production security review. Tauri Windows installer and signing; verified publication exports and animation codecs. A Windows installer and the complete seven-phase platform are not part of v0.1.

## Release gate

Do not label the complete enterprise platform finished until every first-release criterion in the original brief is implemented and tested. Track incomplete capabilities explicitly instead of adding decorative controls.
