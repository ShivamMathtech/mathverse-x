# Validation record — v0.1.0

Environment: Linux, Node.js 24.22.1, Python 3.12.14. Date: 7 November 2026.

## Automated checks

- Frontend numerical, sampling, expression-boundary and project-format tests: 34 passed.
- Backend mathematical reference, API authentication, CORS, input limits, safe parsing and child-process timeout tests: 23 passed.
- A fresh npm ci installation, TypeScript strict compilation and Vite production build: passed.
- Windows-compatible native npm dependency variants are present in the lockfile. No platform-specific node_modules are packaged.

## Observed browser behavior

- Initial Cartesian curves rendered from their equations with the Python service disconnected.
- Editing a curve to x^2 updated the graph.
- Evaluating sqrt(2) + sin(pi/4) returned 2.12132034356.
- Differentiating x^2 at x=3 returned 6.00000000019, with the numerical error estimate displayed.
- Integrating x^2 over [0,1] returned 0.333333333333.
- Tangent and derivative overlays, polar example, zoom and equal axis scale controls responded.
- An invalid expression showed its parse error; correcting it restored graphing.
- JSON download, new project and JSON reopen restored the saved curve, parameter and viewport data.
- CSV download produced a browser download file; all 962 rows were checked against the two analytical source curves (maximum absolute error 8.89e-16).
- Dark and light layouts rendered correctly at the inspected desktop viewport.
- PNG preparation decoded the serialized SVG and produced a successful export notification.

## Verification limits

The browser export event did not expose the SVG download file, so external SVG file delivery was not independently confirmed in this environment. The export implementation serializes the live SVG, and PNG preparation exercised SVG decoding. Physical Windows execution, mobile-device interaction, full browser-to-live-Python connectivity, Docker execution and a live Vercel deployment were not performed here. Backend behavior was exercised through FastAPI's integration client, including spawned computation processes.

The current production build includes a large mathematical worker and a KaTeX/React UI bundle. Vite reports an advisory about a UI chunk over 500 KB; it is not a build failure. Further bundle splitting and progressive loading belong to performance work. Backend tests emit a Starlette notice about its future test-client transport preference; all tests pass with the pinned httpx version.

This validates the implemented foundation, not the complete seven-phase product. See ROADMAP.md for pending work.
