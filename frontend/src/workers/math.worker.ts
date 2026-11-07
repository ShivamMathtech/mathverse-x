import { compileScalar, differentiate } from "../mathematics/expression";
import { integrate, numericalDerivative, root } from "../mathematics/numerical";
import { sampleProject } from "../mathematics/sampling";
import type { ComputeRequest, ComputeResult } from "../mathematics/types";
self.onmessage = (event: MessageEvent<ComputeRequest>) => {
  try {
    const request = event.data;
    let result: ComputeResult;
    if (request.type === "sample") result = sampleProject(request.payload);
    else if (request.type === "symbolicDerivative")
      result = differentiate(request.expression);
    else {
      const f = compileScalar(request.expression, request.parameters).evaluate;
      if (request.operation === "derivative")
        result = numericalDerivative(f, request.x);
      else if (request.operation === "integral")
        result = integrate(f, request.lo, request.hi);
      else if (request.operation === "root")
        result = root(f, request.lo, request.hi);
      else {
        const value = f(request.x);
        if (!Number.isFinite(value))
          throw new Error("Result is not a finite real number.");
        result = { value, method: "Scalar evaluation" };
      }
    }
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
