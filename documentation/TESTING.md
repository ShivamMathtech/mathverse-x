# Validation strategy

Use Vitest for numerical kernels and portable-project validation. Use pytest and FastAPI TestClient for the optional Python service. CI runs a clean npm install, typecheck/build, frontend tests and backend tests.

Analytical references: d(x²)/dx at x=3 is 6; integral of x² on [0,1] is 1/3; reversed bounds negate an integral; sin(x) integrates to 2 on [0,pi]; bisection on x²-2 returns sqrt(2) with small residual; 1/x across zero must be rejected; polar r=2 lies on a circle; parametric (cos t,sin t) has unit norm. Sample segmentation must not bridge the pole at x=0 for 1/x or poles of tan(x).

Parser regression cases reject assignments, member access, unknown variables, oversized input and recursive/dynamic evaluation. Project import rejects unsupported versions, invalid bounds, excessive layers and unknown plot kinds. Worker timeouts terminate the worker, and a later request creates a new one.

API tests verify authentication, origin behavior, request validation, algebraic results, safe AST parsing and child-process timeout cleanup. Manual browser checks cover expression edits, layer visibility, pan/zoom, save/reload, examples, calculus controls, theme, exports and the disconnected-backend flow. Document any checks that the environment prevents.
