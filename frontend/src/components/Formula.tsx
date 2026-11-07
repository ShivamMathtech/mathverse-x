import katex from "katex";
import { useMemo } from "react";
export function Formula({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        trust: false,
        strict: "ignore",
        output: "html",
      });
    } catch {
      return "";
    }
  }, [latex]);
  return (
    <span className="formula" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
