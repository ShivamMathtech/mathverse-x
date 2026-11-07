import { useEffect, useRef, useState } from "react";
export function NumberField({
  label,
  value,
  onChange,
  min = -1e7,
  max = 1e7,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const dirty = useRef(false);
  const [draft, setDraft] = useState(String(value)),
    [error, setError] = useState(false);
  useEffect(() => {
    setDraft(String(Number(value.toPrecision(8))));
    setError(false);
    dirty.current = false;
  }, [value]);
  function commit() {
    if (!dirty.current) return;
    const n = Number(draft);
    if (draft.trim() && Number.isFinite(n) && n >= min && n <= max) {
      setError(false);
      dirty.current = false;
      onChange(n);
      setDraft(String(Number(value.toPrecision(8))));
    } else setError(true);
  }
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        aria-invalid={error}
        value={draft}
        inputMode="decimal"
        onChange={(e) => {
          dirty.current = true;
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
      {error && (
        <small>
          Enter {min} to {max}
        </small>
      )}
    </label>
  );
}
