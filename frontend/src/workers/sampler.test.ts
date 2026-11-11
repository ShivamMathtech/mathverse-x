import { afterEach, expect, it, vi } from "vitest";
import { Sampler, type WorkerPort } from "./sampler";
import { freshProject } from "../state/project";
class FakeWorker implements WorkerPort {
  onmessage: WorkerPort["onmessage"] = null;
  onerror: WorkerPort["onerror"] = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  respond(data: unknown) { this.onmessage?.call(this as unknown as Worker, { data } as MessageEvent); }
}
afterEach(() => vi.useRealTimers());
it("reuses one worker for sequential frames and refuses an accumulating queue", async () => {
  const worker = new FakeWorker(), factory = vi.fn(() => worker), sampler = new Sampler(factory);
  const project = freshProject();
  const first = sampler.sample({ project, time: 0 });
  await expect(sampler.sample({ project, time: 1 })).rejects.toThrow(/already/);
  worker.respond({ ok: true, result: [] }); await first;
  const second = sampler.sample({ project, time: 2 });
  worker.respond({ ok: true, result: [] }); await second;
  expect(factory).toHaveBeenCalledTimes(1);
  expect(worker.postMessage).toHaveBeenLastCalledWith({ type: "sample", payload: { project, time: 2 } });
  sampler.dispose(); expect(worker.terminate).toHaveBeenCalledTimes(1);
});
it("terminates an overdue worker and can recover on a new request", async () => {
  vi.useFakeTimers();
  const workers: FakeWorker[] = [];
  const sampler = new Sampler(() => { const w = new FakeWorker(); workers.push(w); return w; });
  const pending = expect(sampler.sample({ project: freshProject() })).rejects.toThrow(/8 seconds/);
  await vi.advanceTimersByTimeAsync(8000); await pending;
  expect(workers[0].terminate).toHaveBeenCalledOnce();
  const recovered = sampler.sample({ project: freshProject() });
  workers[1].respond({ ok: true, result: [] }); await expect(recovered).resolves.toEqual([]);
  sampler.dispose();
});
it("cancels in-flight work when a project changes or the component unmounts", async () => {
  const worker = new FakeWorker(), sampler = new Sampler(() => worker);
  const pending = expect(sampler.sample({ project: freshProject() })).rejects.toMatchObject({ name: "AbortError" });
  sampler.dispose(); await pending;
  expect(worker.onmessage).toBeNull(); expect(worker.terminate).toHaveBeenCalledOnce();
});
