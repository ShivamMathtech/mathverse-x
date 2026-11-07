# Optional symbolic API

Base URL locally: `http://localhost:8000`. `/health` is public; `/api/*` requires `Authorization: Bearer <your-token>`.

| Route | Purpose |
| --- | --- |
| GET /health | Service identity, version and process health |
| GET /api/capabilities | Authenticated capability discovery |
| POST /api/symbolic | Run one isolated symbolic operation |

Request example:

```json
{"operation":"differentiate","expression":"x^2","variable":"x"}
```

Operations: `differentiate`, `integrate` (indefinite), `simplify`, `expand`, `factor`, `solve` (real-domain equation `expression = 0`). Variables: x, y, z, t, a, b, c. Constants: pi and e. Functions: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, exp, log, sqrt, abs. Functions take one argument. Operators: +, -, *, /, ^ (or **). Use explicit multiplication.

Each request permits at most 300 expression characters and a 120-node AST. Numerical literals are bounded to ±1e9 and explicit numerical exponents to ±100. Exponents must be literals, a single symbol or a unary signed expression; nested exponent trees and unsupported AST constructs are rejected. The Python parser constructs SymPy objects and does not pass input to eval, sympify or parse_expr.

Response fields: `result` (plain mathematical text), `latex`, `elapsed_ms`, `fully_evaluated`, and `warning`. An unevaluated Integral, Derivative or ConditionSet is returned honestly with a warning; the client does not invent a closed form. Indefinite integrals require an arbitrary additive constant. Parameters remain symbolic in Python, whereas browser numerical calculations use the current slider values.

The request-body limit is 8 KB, the symbolic output limit is 50,000 combined characters, and at most two jobs run concurrently per process. All jobs run under an 8-second wall-clock deadline. The API is a single-owner optional computation service, not a multi-tenant backend. Project persistence is currently in the browser and portable JSON, not an API endpoint.
