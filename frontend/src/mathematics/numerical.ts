import type { NumericResult } from "./types";
function finite(f: (x: number) => number, x: number) {
  const y = f(x);
  if (!Number.isFinite(y))
    throw new Error(
      `Function is not finite at x=${x.toPrecision(6)}. Split the domain around singularities.`,
    );
  return y;
}
function bounds(a: number, b: number) {
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    Math.abs(a) > 1e7 ||
    Math.abs(b) > 1e7
  )
    throw new Error("Bounds must be finite and within ±10,000,000.");
}
export function numericalDerivative(
  f: (x: number) => number,
  x: number,
): NumericResult {
  bounds(x, x);
  const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x));
  const coarse = (finite(f, x + h) - finite(f, x - h)) / (2 * h);
  const fine = (finite(f, x + h / 2) - finite(f, x - h / 2)) / h;
  const result = fine + (fine - coarse) / 3;
  if (!Number.isFinite(result)) throw new Error("Derivative overflowed.");
  return {
    value: result,
    errorEstimate: Math.abs(fine - coarse) / 3,
    method: "Richardson-extrapolated central difference",
  };
}
export function integrate(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance = 1e-8,
): NumericResult {
  bounds(a, b);
  if (a === b)
    return {
      value: 0,
      errorEstimate: 0,
      iterations: 0,
      method: "Adaptive Simpson quadrature",
    };
  if (a > b) {
    const r = integrate(f, b, a, tolerance);
    return { ...r, value: -r.value };
  }
  // Check a regular grid first so common internal singularities cannot be missed.
  for (let i = 0; i <= 128; i++) finite(f, a + ((b - a) * i) / 128);
  let calls = 0,
    error = 0;
  function split(
    lo: number,
    hi: number,
    fl: number,
    fm: number,
    fh: number,
    whole: number,
    eps: number,
    depth: number,
  ): number {
    if (++calls > 20000)
      throw new Error(
        "Integration exceeded its evaluation budget. Narrow the interval.",
      );
    const mid = (lo + hi) / 2,
      lm = (lo + mid) / 2,
      rm = (mid + hi) / 2;
    const f1 = finite(f, lm),
      f2 = finite(f, rm);
    const left = ((mid - lo) * (fl + 4 * f1 + fm)) / 6,
      right = ((hi - mid) * (fm + 4 * f2 + fh)) / 6;
    const delta = left + right - whole;
    if (Math.abs(delta) <= 15 * eps) {
      error += Math.abs(delta) / 15;
      return left + right + delta / 15;
    }
    if (depth === 0)
      throw new Error(
        "Quadrature did not converge. Check continuity or use a smaller interval.",
      );
    return (
      split(lo, mid, fl, f1, fm, left, eps / 2, depth - 1) +
      split(mid, hi, fm, f2, fh, right, eps / 2, depth - 1)
    );
  }
  const m = (a + b) / 2,
    fa = finite(f, a),
    fm = finite(f, m),
    fb = finite(f, b);
  const value = split(
    a,
    b,
    fa,
    fm,
    fb,
    ((b - a) * (fa + 4 * fm + fb)) / 6,
    tolerance,
    22,
  );
  if (!Number.isFinite(value)) throw new Error("Integral overflowed.");
  return {
    value,
    errorEstimate: error,
    iterations: calls,
    method: "Adaptive Simpson quadrature (smooth finite functions)",
  };
}
export function root(
  f: (x: number) => number,
  a: number,
  b: number,
): NumericResult {
  bounds(a, b);
  if (a >= b)
    throw new Error("The lower bound must be smaller than the upper bound.");
  let fa = finite(f, a);
  const fb = finite(f, b);
  if (fa === 0)
    return { value: a, residual: 0, iterations: 0, method: "Bisection" };
  if (fb === 0)
    return { value: b, residual: 0, iterations: 0, method: "Bisection" };
  if (Math.sign(fa) === Math.sign(fb))
    throw new Error(
      "Root finding needs opposite endpoint signs. It can miss even-multiplicity roots.",
    );
  for (let i = 1; i <= 150; i++) {
    const m = (a + b) / 2,
      fm = finite(f, m);
    if (Math.abs(fm) < 1e-9)
      return {
        value: m,
        residual: Math.abs(fm),
        iterations: i,
        errorEstimate: (b - a) / 2,
        method: "Bisection",
      };
    if (m === a || m === b) break;
    if (Math.sign(fm) === Math.sign(fa)) {
      a = m;
      fa = fm;
    } else b = m;
  }
  throw new Error(
    "No root with a small residual was found. A sign change may be a discontinuity.",
  );
}
