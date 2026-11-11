import type { SampledCurve, SampleRequest } from "../mathematics/types";

export type WorkerPort = Pick<Worker, "onmessage" | "onerror" | "postMessage" | "terminate">;
/** A single reusable worker. The caller waits for each frame; no frame queue builds up. */
export class Sampler {
  private worker: WorkerPort | null = null;
  private cancel: (() => void) | null = null;
  constructor(private factory: () => WorkerPort = () => new Worker(
    new URL("./math.worker.ts", import.meta.url), { type: "module" },
  )) {}
  sample(payload: SampleRequest): Promise<SampledCurve[]> {
    if (this.cancel) return Promise.reject(new Error("A graph frame is already being calculated."));
    return new Promise((resolve, reject) => {
      const worker = this.worker ??= this.factory();
      const finish = () => {
        clearTimeout(timer);
        worker.onmessage = null;
        worker.onerror = null;
        this.cancel = null;
      };
      const fail = (error: Error) => {
        finish(); worker.terminate(); this.worker = null; reject(error);
      };
      const timer = setTimeout(() => fail(new Error("Graph calculation exceeded 8 seconds. Lower the sampling resolution or simplify the expression.")), 8000);
      this.cancel = () => fail(new DOMException("Calculation cancelled", "AbortError"));
      worker.onmessage = (event) => {
        finish();
        if (event.data.ok) resolve(event.data.result);
        else reject(new Error(event.data.error));
      };
      worker.onerror = (event) => fail(new Error(event.message || "The graph worker could not start."));
      try { worker.postMessage({ type: "sample", payload }); }
      catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
    });
  }
  dispose() {
    if (this.cancel) this.cancel();
    else this.worker?.terminate();
    this.worker = null;
  }
}
