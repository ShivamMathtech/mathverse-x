import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FolderOpen,
  GitBranch,
  Layers3,
  PanelLeftClose,
  Plus,
  Redo2,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useWorkspace, storageKey } from "./state/store";
import {
  exampleProject,
  examples,
  freshProject,
  newCurve,
  parseProject,
  palette,
} from "./state/project";
import { compute } from "./workers/client";
import type {
  CurveKind,
  NumericResult,
  SampledCurve,
} from "./mathematics/types";
import { Plot } from "./graphing/Plot";
import { download, exportCSV, exportGraph, slug } from "./graphing/export";
import { Formula } from "./components/Formula";
import { Inspector, type NumericOperation } from "./components/Inspector";
import { Console, type HistoryEntry } from "./components/Console";
import { Modal } from "./components/Modal";
export function App() {
  const store = useWorkspace(),
    { project } = store,
    selected = project.curves.find((c) => c.id === project.selectedId);
  const [samples, setSamples] = useState<SampledCurve[]>([]),
    [sampling, setSampling] = useState(true),
    [sampleError, setSampleError] = useState("");
  const [leftTab, setLeftTab] = useState<"expressions" | "examples">(
      "expressions",
    ),
    [inspectorTab, setInspectorTab] = useState<"properties" | "calculus">(
      "properties",
    );
  const [modal, setModal] = useState<"settings" | "help" | null>(null),
    [notice, setNotice] = useState(""),
    [saveState, setSaveState] = useState("Saving…");
  const [light, setLight] = useState(() => {
      try {
        return localStorage.getItem("mathverse-x:theme") === "light";
      } catch {
        return false;
      }
    }),
    [fontSize, setFontSize] = useState(13);
  const [sidebar, setSidebar] = useState(true),
    [showInspector, setShowInspector] = useState(true),
    [exportMenu, setExportMenu] = useState(false);
  const [x, setX] = useState(1),
    [lo, setLo] = useState(0),
    [hi, setHi] = useState(Math.PI),
    [showDerivative, setShowDerivative] = useState(false),
    [showTangent, setShowTangent] = useState(false),
    [showArea, setShowArea] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]),
    [busy, setBusy] = useState(false);
  const [apiURL, setApiURL] = useState(import.meta.env.VITE_API_URL ?? ""),
    [token, setToken] = useState(""),
    [connection, setConnection] = useState<"off" | "busy" | "connected">("off");
  const svgRef = useRef<SVGSVGElement>(null),
    fileRef = useRef<HTMLInputElement>(null),
    job = useRef<AbortController | null>(null),
    historyId = useRef(0);
  const notify = (text: string) => setNotice(text);
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    try {
      localStorage.setItem("mathverse-x:theme", light ? "light" : "dark");
    } catch {
      /* Theme persistence is optional. */
    }
  }, [light]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (store.warning) {
      setNotice(store.warning);
      store.clearWarning();
    }
  }, [store.warning]);
  useEffect(() => {
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(project));
        setSaveState("Saved on this device");
      } catch {
        setSaveState("Storage unavailable");
        notify(
          "Browser storage is unavailable or full. Download your project JSON to keep it.",
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    const controller = new AbortController();
    setSampling(true);
    setSampleError("");
    const timer = setTimeout(() => {
      compute<SampledCurve[]>(
        {
          type: "sample",
          payload: {
            project,
            derivativeId: showDerivative ? project.selectedId : undefined,
            tangent: showTangent ? { id: project.selectedId, x } : undefined,
          },
        },
        controller.signal,
      )
        .then(setSamples)
        .catch((e) => {
          if (e.name !== "AbortError") {
            setSamples([]);
            setSampleError(e.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSampling(false);
        });
    }, 100);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [project, showDerivative, showTangent, x]);
  function save() {
    download(
      JSON.stringify(project, null, 2),
      `${slug(project.name)}.mathverse.json`,
    );
    notify("Project JSON downloaded.");
  }
  function blank() {
    const p = freshProject();
    store.replace({
      ...p,
      name: "Untitled exploration",
      curves: [],
      selectedId: "",
    });
    setHistory([]);
    setShowArea(false);
    notify("New workspace opened. Undo restores the previous project.");
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "s") {
        e.preventDefault();
        save();
      }
      if (e.key === "o") {
        e.preventDefault();
        fileRef.current?.click();
      }
      const editing = (e.target as HTMLElement)?.matches(
        "input,textarea,select",
      );
      if (!editing && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      }
      if (!editing && e.key === "y") {
        e.preventDefault();
        store.redo();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function addHistory(
    input: string,
    result: string,
    details?: string,
    latex?: string,
    error = false,
  ) {
    setHistory((h) =>
      [
        ...h,
        { id: ++historyId.current, input, result, details, latex, error },
      ].slice(-50),
    );
  }
  function startJob() {
    job.current?.abort();
    const controller = new AbortController();
    job.current = controller;
    setBusy(true);
    return controller;
  }
  function finishJob(controller: AbortController) {
    if (job.current === controller) {
      job.current = null;
      setBusy(false);
    }
  }
  function failed(input: string, error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      notify("Calculation cancelled.");
      return;
    }
    addHistory(
      input,
      error instanceof Error ? error.message : String(error),
      undefined,
      undefined,
      true,
    );
  }
  async function runNumeric(operation: NumericOperation) {
    if (!selected || selected.kind !== "cartesian") return;
    const controller = startJob(),
      input = `${operation}(${selected.expression})`;
    try {
      const r = await compute<NumericResult>(
        {
          type: "numeric",
          operation,
          expression: selected.expression,
          parameters: project.parameters,
          x,
          lo,
          hi,
        },
        controller.signal,
      );
      addHistory(
        input,
        Number(r.value.toPrecision(12)).toString(),
        `${r.method}${r.errorEstimate !== undefined ? ` · est. error ${r.errorEstimate.toExponential(2)}` : ""}${r.residual !== undefined ? ` · residual ${r.residual.toExponential(2)}` : ""}${r.iterations !== undefined ? ` · ${r.iterations} iterations` : ""}${operation === "evaluate" || operation === "derivative" ? ` · x = ${x}` : ` · [${lo}, ${hi}]`}`,
      );
      if (operation === "integral") setShowArea(true);
    } catch (e) {
      failed(input, e);
    } finally {
      finishJob(controller);
    }
  }
  async function addDerivative() {
    if (!selected) return;
    const controller = startJob();
    try {
      const expression = await compute<string>(
        { type: "symbolicDerivative", expression: selected.expression },
        controller.signal,
      );
      if (useWorkspace.getState().project !== project)
        throw new Error("The workspace changed during calculation. Run the derivative again.");
      if (project.curves.length >= 20)
        throw new Error("Maximum of 20 curves reached.");
      const c = { ...newCurve(project.curves.length), expression };
      store.update({ curves: [...project.curves, c] });
      addHistory(
        `d/dx (${selected.expression})`,
        expression,
        "Symbolic differentiation in the browser",
      );
    } catch (e) {
      failed("Differentiate", e);
    } finally {
      finishJob(controller);
    }
  }
  function safeURL() {
    const u = new URL(apiURL);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      throw new Error(
        "Enter an http:// or https:// API URL without credentials.",
      );
    if (location.protocol === "https:" && u.protocol !== "https:")
      throw new Error(
        "A deployed HTTPS frontend needs an HTTPS backend. Use both apps locally for localhost development.",
      );
    return apiURL.replace(/\/+$/, "");
  }
  async function connect() {
    setConnection("busy");
    try {
      const url = safeURL();
      const res = await fetch(`${url}/api/capabilities`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok)
        throw new Error(
          res.status === 401
            ? "The API token was rejected."
            : `Connection failed (${res.status}). Check the token and CORS_ORIGINS.`,
        );
      const data = await res.json();
      if (data.service !== "mathverse-x")
        throw new Error("This URL is not a MATHVERSE X backend.");
      setConnection("connected");
      notify("Python symbolic engine connected.");
    } catch (e) {
      setConnection("off");
      notify(e instanceof Error ? e.message : "Connection failed.");
    }
  }
  async function consoleRun(expression: string, operation: string) {
    if (!expression.trim()) return;
    const controller = startJob(),
      input = `${operation.replace("backend:", "")}(${expression})`;
    try {
      if (operation.startsWith("backend:")) {
        const res = await fetch(`${safeURL()}/api/symbolic`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            expression,
            operation: operation.slice(8),
            variable: "x",
          }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(12000),
          ]),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : `Python request failed (${res.status}).`,
          );
        addHistory(
          input,
          data.result,
          `SymPy · ${data.elapsed_ms.toFixed(1)} ms${data.warning ? ` · ${data.warning}` : ""}${operation === "backend:integrate" ? " · Indefinite integral, add + C" : ""}`,
          data.latex,
        );
      } else if (operation === "symbolicDerivative") {
        const result = await compute<string>(
          { type: "symbolicDerivative", expression },
          controller.signal,
        );
        addHistory(input, result, "Symbolic derivative with respect to x");
      } else {
        const r = await compute<NumericResult>(
          {
            type: "numeric",
            operation: "evaluate",
            expression,
            parameters: project.parameters,
            x,
            lo,
            hi,
          },
          controller.signal,
        );
        addHistory(
          expression,
          Number(r.value.toPrecision(12)).toString(),
          `Browser evaluation · x = ${x}`,
        );
      }
    } catch (e) {
      failed(input, e);
    } finally {
      finishJob(controller);
    }
  }
  async function exportAs(format: "svg" | "png" | "csv") {
    setExportMenu(false);
    try {
      if (format === "csv") exportCSV(samples, project);
      else if (svgRef.current)
        await exportGraph(svgRef.current, project, format, light);
      notify(`${format.toUpperCase()} export downloaded.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.");
    }
  }
  const selectedSample = samples.find((s) => s.id === selected?.id),
    sampleCount = samples.reduce(
      (n, s) => n + s.segments.reduce((sum, p) => sum + p.length, 0),
      0,
    );
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={21} />
          </div>
          <span>
            MATHVERSE <b>X</b>
          </span>
          <small>STUDIO</small>
        </div>
        <div className="top-divider" />
        <div className="project-heading">
          <input
            aria-label="Project name"
            value={project.name}
            maxLength={80}
            onChange={(e) =>
              store.update({ name: e.target.value || "Untitled exploration" })
            }
          />
          <span>
            <span className="live-dot" />
            {saveState}
          </span>
        </div>
        <div className="spacer" />
        <button className="top-help" onClick={() => setModal("help")}>
          <BookOpen size={15} />
          Quick guide
        </button>
        <button
          className="icon-button"
          aria-label="Settings"
          onClick={() => setModal("settings")}
        >
          <Settings2 size={17} />
        </button>
        <div className="version-pill">v0.1</div>
      </header>
      <div className="toolbar">
        <div className="tool-group">
          <button onClick={blank}>
            <FilePlus2 size={15} />
            <span>New</span>
          </button>
          <button onClick={() => fileRef.current?.click()}>
            <FolderOpen size={15} />
            <span>Open</span>
          </button>
          <button onClick={save}>
            <Save size={15} />
            <span>Save project</span>
          </button>
        </div>
        <div className="toolbar-divider" />
        <div className="tool-group">
          <button
            aria-label="Undo"
            title="Undo · Ctrl+Z"
            disabled={!store.past.length}
            onClick={store.undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            aria-label="Redo"
            title="Redo · Ctrl+Shift+Z"
            disabled={!store.future.length}
            onClick={store.redo}
          >
            <Redo2 size={16} />
          </button>
        </div>
        <div className="spacer" />
        <span className="engine-status">
          <span className="live-dot" />
          {connection === "connected"
            ? "Browser + Python"
            : "Local computation"}
        </span>
        <div className="export-control">
          <button
            className="export-button"
            disabled={sampling || !!sampleError}
            onClick={() => setExportMenu(!exportMenu)}
          >
            <Download size={15} />
            Export
            <ChevronDown size={13} />
          </button>
          {exportMenu && (
            <div className="export-menu">
              {(["svg", "png", "csv"] as const).map((f) => (
                <button key={f} onClick={() => void exportAs(f)}>
                  {f === "svg"
                    ? "SVG · vector graphic"
                    : f === "png"
                      ? "PNG · 2× resolution"
                      : "CSV · sampled points"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileRef}
        hidden
        accept=".json,.mathverse.json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            if (f.size > 250000)
              throw new Error("Project file exceeds the 250 KB limit.");
            store.replace(parseProject(await f.text()));
            setHistory([]);
            notify(`Opened ${f.name}`);
          } catch (error) {
            notify(
              error instanceof Error
                ? error.message
                : "Could not open project.",
            );
          }
          e.target.value = "";
        }}
      />
      <div
        className={`workspace ${!sidebar ? "hide-sidebar" : ""} ${!showInspector ? "hide-inspector" : ""}`}
      >
        <nav className="rail" aria-label="Workspace navigation">
          <button
            className={leftTab === "expressions" && sidebar ? "active" : ""}
            aria-label="Expressions"
            onClick={() => {
              setSidebar(true);
              setLeftTab("expressions");
            }}
          >
            <Layers3 size={20} />
          </button>
          <button
            className={leftTab === "examples" && sidebar ? "active" : ""}
            aria-label="Example gallery"
            onClick={() => {
              setSidebar(true);
              setLeftTab("examples");
            }}
          >
            <Box size={20} />
          </button>
          <button
            aria-label="Calculus tools"
            className={
              inspectorTab === "calculus" && showInspector ? "active" : ""
            }
            onClick={() => {
              setShowInspector(true);
              setInspectorTab("calculus");
            }}
          >
            <span className="sigma-icon">∫</span>
          </button>
          <div className="spacer" />
          <button aria-label="Help" onClick={() => setModal("help")}>
            <CircleHelp size={20} />
          </button>
        </nav>
        {sidebar && (
          <aside className="explorer">
            <div className="panel-heading">
              <strong>Mathematical explorer</strong>
              <button
                aria-label="Hide explorer"
                onClick={() => setSidebar(false)}
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
            <div className="tabs">
              <button
                className={leftTab === "expressions" ? "active" : ""}
                onClick={() => setLeftTab("expressions")}
              >
                Expressions <small>{project.curves.length}</small>
              </button>
              <button
                className={leftTab === "examples" ? "active" : ""}
                onClick={() => setLeftTab("examples")}
              >
                Examples
              </button>
            </div>
            {leftTab === "expressions" ? (
              <>
                <div className="expression-list">
                  {project.curves.map((c, i) => {
                    const s = samples.find((s) => s.id === c.id);
                    return (
                      <article
                        key={c.id}
                        className={`expression-card ${c.id === project.selectedId ? "selected" : ""}`}
                        onClick={() => {
                          if (c.id !== project.selectedId)
                            store.update({ selectedId: c.id }, false);
                        }}
                      >
                        <div className="expression-top">
                          <button
                            className="visibility"
                            aria-label={`${c.visible ? "Hide" : "Show"} expression ${i + 1}`}
                            style={{ color: c.color }}
                            onClick={() =>
                              store.curve(c.id, { visible: !c.visible })
                            }
                          >
                            {c.visible ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>
                          <span>
                            EXPRESSION {String(i + 1).padStart(2, "0")}
                          </span>
                          <button
                            className="delete-expression"
                            aria-label={`Delete expression ${i + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              store.remove(c.id);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="equation-input">
                          <span style={{ color: c.color }}>
                            {c.kind === "cartesian"
                              ? "y"
                              : c.kind === "polar"
                                ? "r"
                                : "x"}{" "}
                            =
                          </span>
                          <input
                            aria-label={`Expression ${i + 1}`}
                            value={c.expression}
                            maxLength={300}
                            spellCheck={false}
                            onChange={(e) =>
                              store.curve(c.id, { expression: e.target.value })
                            }
                          />
                        </div>
                        {c.kind === "parametric" && (
                          <div className="equation-input">
                            <span style={{ color: c.color }}>y =</span>
                            <input
                              aria-label={`Y expression ${i + 1}`}
                              value={c.expressionY}
                              maxLength={300}
                              spellCheck={false}
                              onChange={(e) =>
                                store.curve(c.id, {
                                  expressionY: e.target.value,
                                })
                              }
                            />
                          </div>
                        )}
                        {s?.latex && c.kind !== "parametric" && (
                          <div className="equation-preview">
                            <Formula latex={s.latex} />
                          </div>
                        )}
                        <select
                          aria-label={`Graph type ${i + 1}`}
                          value={c.kind}
                          onChange={(e) => {
                            const kind = e.target.value as CurveKind;
                            store.curve(c.id, {
                              kind,
                              expression:
                                kind === "polar"
                                  ? "3 * cos(3 * theta)"
                                  : kind === "parametric"
                                    ? "3 * cos(t)"
                                    : "sin(x)",
                              expressionY: "3 * sin(t)",
                            });
                          }}
                        >
                          <option value="cartesian">
                            Cartesian · y = f(x)
                          </option>
                          <option value="polar">Polar · r = f(θ)</option>
                          <option value="parametric">
                            Parametric · x(t), y(t)
                          </option>
                        </select>
                        {s?.error && (
                          <p className="expression-error">{s.error}</p>
                        )}
                      </article>
                    );
                  })}
                  <button
                    className="add-expression"
                    onClick={store.add}
                    disabled={project.curves.length >= 20}
                  >
                    <Plus size={16} />
                    Add expression
                  </button>
                </div>
                <div className="explorer-tip">
                  <span>EXPLORE AN IDEA</span>
                  <p>Give your equations room to move.</p>
                  <button onClick={() => setLeftTab("examples")}>
                    Open the example gallery <span>↗</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="example-list">
                <p className="muted">
                  Working starting points. Every curve is calculated from its
                  equation.
                </p>
                {examples.map((e, i) => (
                  <button
                    className="example-card"
                    key={e.name}
                    onClick={() => {
                      store.replace(exampleProject(i));
                      setShowArea(false);
                      setLeftTab("expressions");
                      setHistory([]);
                      notify(
                        "Example opened. Undo returns to your previous project.",
                      );
                    }}
                  >
                    <div
                      className={`example-glyph glyph-${i}`}
                      style={{ color: palette[i % palette.length] }}
                    >
                      {["∿", "✻", "∞", "∿", "⌁", "⌞"][i]}
                    </div>
                    <span>
                      <strong>{e.name}</strong>
                      <small>{e.label}</small>
                    </span>
                    <span>↗</span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}
        <main className="main-workspace">
          <div className="canvas-heading">
            <span className="workspace-tab">
              <GitBranch size={14} />
              Graph studio
              <span className="tab-dot" />
            </span>
            <div className="spacer" />
            <span className="dimension-label">CARTESIAN CANVAS</span>
            <button
              aria-label="Toggle inspector"
              onClick={() => setShowInspector(!showInspector)}
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>
          <div className="canvas-title">
            <div>
              <div className="eyebrow">MATHEMATICAL WORKSPACE</div>
              <h1>{project.name}</h1>
              <p>
                {selected
                  ? selected.kind === "cartesian"
                    ? "Explore the shape of a function."
                    : "Explore curves beyond Cartesian functions."
                  : "Begin with an equation."}
              </p>
            </div>
            <span className="canvas-mode">
              2D <span>/ REAL SPACE</span>
            </span>
          </div>
          <Plot
            project={project}
            samples={samples}
            light={light}
            busy={sampling}
            svgRef={svgRef}
            onView={(viewport) => store.update({ viewport })}
            area={
              showArea && selected?.kind === "cartesian"
                ? { id: selected.id, lo, hi }
                : undefined
            }
            onInspect={(value) => {
              setX(Number(value.toPrecision(7)));
              setInspectorTab("calculus");
              setShowInspector(true);
            }}
          />
          {sampleError && (
            <div className="graph-error" role="alert">
              {sampleError}
            </div>
          )}
          <div className="graph-footer">
            <div className="legend">
              {project.curves
                .filter((c) => c.visible)
                .map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => store.update({ selectedId: c.id }, false)}
                    title={c.expression}
                  >
                    <span style={{ background: c.color }} />f<sub>{i + 1}</sub>
                    <code>{c.expression}</code>
                  </button>
                ))}
            </div>
            <span>
              {sampling
                ? "Sampling…"
                : `${sampleCount.toLocaleString()} points`}
            </span>
          </div>
          <Console
            history={history}
            onClear={() => setHistory([])}
            onRun={(e, o) => void consoleRun(e, o)}
            busy={busy}
            onCancel={() => job.current?.abort()}
            connected={connection === "connected"}
            onConnect={() => setModal("settings")}
          />
        </main>
        {showInspector && (
          <Inspector
            tab={inspectorTab}
            setTab={setInspectorTab}
            x={x}
            setX={setX}
            lo={lo}
            setLo={setLo}
            hi={hi}
            setHi={setHi}
            derivative={showDerivative}
            setDerivative={setShowDerivative}
            tangent={showTangent}
            setTangent={setShowTangent}
            area={showArea}
            setArea={setShowArea}
            run={(op) => void runNumeric(op)}
            addDerivative={() => void addDerivative()}
            notify={notify}
            busy={busy}
          />
        )}
      </div>
      <footer className="statusbar">
        <span>
          <span className="live-dot" />
          {sampleError
            ? "Computation error"
            : sampling
              ? "Computing"
              : selectedSample?.error
                ? "Expression needs attention"
                : "Workspace ready"}
        </span>
        <span>
          {project.curves.length} expressions{" "}
          <span className="status-divider">|</span> Radians{" "}
          <span className="status-divider">|</span> Float64
        </span>
        <div className="spacer" />
        <span>
          PHASE 01 <span className="status-divider">/</span> FOUNDATION
        </span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal === "settings" && (
        <Modal title="Workspace settings" onClose={() => setModal(null)}>
          <section className="modal-section">
            <h3>Appearance</h3>
            <div className="button-pair">
              <button
                className={!light ? "selected-option" : ""}
                onClick={() => setLight(false)}
              >
                Dark graphite
              </button>
              <button
                className={light ? "selected-option" : ""}
                onClick={() => setLight(true)}
              >
                Light paper
              </button>
            </div>
            <label className="stack-label">
              Interface text size
              <input
                aria-label="Interface text size"
                type="range"
                min="12"
                max="16"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </label>
          </section>
          <section className="modal-section">
            <h3>
              Python symbolic engine <span className="tiny-tag">Optional</span>
            </h3>
            <p>
              Graphing, numerical calculus and project saving run in your
              browser. Connect your FastAPI service for SymPy algebra and
              indefinite integration.
            </p>
            <label className="stack-label">
              API URL
              <input
                placeholder="http://localhost:8000"
                value={apiURL}
                onChange={(e) => {
                  setApiURL(e.target.value);
                  setConnection("off");
                }}
              />
            </label>
            <label className="stack-label">
              API token
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setConnection("off");
                }}
                placeholder="Token from backend/.env"
              />
            </label>
            <p className="muted">
              The token stays in memory for this page session. For a deployed
              frontend, use an HTTPS backend and add your exact frontend origin
              to CORS_ORIGINS.
            </p>
            <button
              className="primary-button"
              disabled={connection === "busy" || !apiURL || !token}
              onClick={() => void connect()}
            >
              {connection === "busy"
                ? "Connecting…"
                : connection === "connected"
                  ? "Connected · test again"
                  : "Connect & test"}
            </button>
          </section>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="A little guide to exploration"
          onClose={() => setModal(null)}
        >
          <div className="help-body">
            <h3>Write naturally, calculate precisely.</h3>
            <p>
              Try <code>sin(x)</code>, <code>x^2</code>,{" "}
              <code>sqrt(abs(x))</code> or <code>x &lt; 0 ? -x : x^2</code>. Use
              explicit multiplication for clarity: <code>2 * sin(x)</code>. All
              angles are in radians.
            </p>
            <h3>Three ways to draw</h3>
            <p>
              <b>Cartesian:</b> y = f(x). <b>Polar:</b> r = f(theta), with t
              accepted as an alias. <b>Parametric:</b> x(t), y(t). Change the
              curve type under its expression; edit the parameter domain in
              Properties. Use Equal axis scale on the canvas to preserve
              geometric proportions.
            </p>
            <h3>Turn a graph into a calculation</h3>
            <p>
              Select a Cartesian curve and open Calculus. Evaluate a point, draw
              a tangent, add a derivative, integrate an interval or locate a
              bracketed root. Error estimates describe the numerical method and
              do not certify arbitrary discontinuous or highly oscillatory
              inputs.
            </p>
            <h3>Your work stays with you</h3>
            <p>
              The current project saves automatically in this browser. Use Save
              project for a portable JSON backup. Open restores it. SVG, PNG and
              sampled CSV exports use the visible curves. Undo is available
              after opening an example or a new project.
            </p>
            <div className="shortcut-list">
              <span>
                Save project <kbd>Ctrl / ⌘ S</kbd>
              </span>
              <span>
                Open project <kbd>Ctrl / ⌘ O</kbd>
              </span>
              <span>
                Undo workspace change <kbd>Ctrl / ⌘ Z</kbd>
              </span>
            </div>
            <p className="muted">
              v0.1 implements Phase 1. 3D, 4D, Projection Lab, data import,
              animation and desktop packaging are later roadmap phases.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
