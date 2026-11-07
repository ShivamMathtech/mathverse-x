import { useState } from "react";
import {
  Terminal,
  ArrowUpRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  Square,
} from "lucide-react";
import { Formula } from "./Formula";
export interface HistoryEntry {
  id: number;
  input: string;
  result: string;
  details?: string;
  latex?: string;
  error?: boolean;
}
export function Console({
  history,
  onClear,
  onRun,
  busy,
  onCancel,
  connected,
  onConnect,
}: {
  history: HistoryEntry[];
  onClear: () => void;
  onRun: (expression: string, operation: string) => void;
  busy: boolean;
  onCancel: () => void;
  connected: boolean;
  onConnect: () => void;
}) {
  const [expression, setExpression] = useState("sqrt(2) + sin(pi / 4)"),
    [operation, setOperation] = useState("evaluate"),
    [collapsed, setCollapsed] = useState(false);
  return (
    <section className={`console ${collapsed ? "collapsed" : ""}`}>
      <div className="console-header">
        <Terminal size={14} />
        <strong>Computation console</strong>
        <span className="tiny-tag">
          {connected ? "Browser + Python" : "Browser engine"}
        </span>
        <div className="spacer" />
        {!connected && (
          <button className="connect-link" onClick={onConnect}>
            Connect Python <ArrowUpRight size={12} />
          </button>
        )}
        <button
          aria-label="Clear console"
          onClick={onClear}
          disabled={!history.length}
        >
          <Trash2 size={14} />
        </button>
        <button
          aria-label={collapsed ? "Expand console" : "Collapse console"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="console-output" aria-live="polite">
            {history.length ? (
              history.slice(-15).map((h) => (
                <div
                  className={`history-row ${h.error ? "error" : ""}`}
                  key={h.id}
                >
                  <span className="history-prompt">›</span>
                  <code>{h.input}</code>
                  <div className="history-result">
                    {h.latex ? (
                      <Formula latex={h.latex} />
                    ) : (
                      <strong>{h.result}</strong>
                    )}
                    {h.details && <small>{h.details}</small>}
                  </div>
                </div>
              ))
            ) : (
              <div className="console-welcome">
                <span>Ready.</span> Enter an expression, or choose a calculus
                tool in the inspector.
              </div>
            )}
          </div>
          <form
            className="console-input"
            onSubmit={(e) => {
              e.preventDefault();
              onRun(expression, operation);
            }}
          >
            <span>›</span>
            <input
              aria-label="Console expression"
              value={expression}
              maxLength={300}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Try sqrt(2) + sin(pi / 4)"
            />
            <select
              aria-label="Console operation"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
            >
              <option value="evaluate">Evaluate</option>
              <option value="symbolicDerivative">Differentiate · local</option>
              {connected &&
                [
                  "simplify",
                  "expand",
                  "factor",
                  "integrate",
                  "solve",
                  "differentiate",
                ].map((op) => (
                  <option key={op} value={`backend:${op}`}>
                    {op} · Python
                  </option>
                ))}
            </select>
            {busy ? (
              <button type="button" className="run-button" onClick={onCancel}>
                <Square size={12} />
                Cancel
              </button>
            ) : (
              <button className="run-button" type="submit">
                Run <span>↵</span>
              </button>
            )}
          </form>
        </>
      )}
    </section>
  );
}
