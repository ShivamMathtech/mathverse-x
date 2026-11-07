import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "katex/dist/katex.min.css";
import "./styles/app.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main
        style={{
          padding: 40,
          color: "#e3e9ec",
          background: "#101214",
          minHeight: "100vh",
          fontFamily: "sans-serif",
        }}
      >
        <h1>MATHVERSE X could not load this workspace.</h1>
        <p>
          Your last saved project is still stored in this browser. Try reloading
          first.
        </p>
        <button onClick={() => location.reload()}>Reload application</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
