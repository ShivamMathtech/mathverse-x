import type { ComputeRequest, ComputeResult } from "../mathematics/types";
export function compute<T extends ComputeResult>(
  request: ComputeRequest,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./math.worker.ts", import.meta.url), {
      type: "module",
    });
    const cleanup = () => {
      clearTimeout(timeout);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Calculation cancelled", "AbortError"));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Calculation timed out after 8 seconds. Simplify the expression or reduce the domain.",
        ),
      );
    }, 8000);
    worker.onmessage = (e) => {
      cleanup();
      if (e.data.ok) resolve(e.data.result);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      cleanup();
      reject(
        new Error(
          e.message ||
            "The computation worker could not start. Reload the page.",
        ),
      );
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    else worker.postMessage(request);
  });
}
