"use client";

import { useEffect, useRef } from "react";

export const CODE_LENGTH = 6;

/**
 * Six boxes for a one-time code. Typing moves to the next box, Backspace to the previous one, and
 * pasting (or the phone's "from Messages/Mail" suggestion) fills them all. `onComplete` runs when the
 * sixth digit lands. The joined value is posted as `name`.
 */
export function CodeInput({
  name,
  digits,
  onChange,
  onComplete,
  disabled,
  invalid,
  resetKey,
}: {
  name: string;
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** When this changes (a wrong code), the cursor goes back to the first box. */
  resetKey?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resetKey) refs.current[0]?.focus();
  }, [resetKey]);

  function setFrom(index: number, text: string) {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const next = [...digits];
    let i = index;
    for (const ch of clean) {
      if (i >= CODE_LENGTH) break;
      next[i] = ch;
      i++;
    }
    onChange(next);
    refs.current[Math.min(i, CODE_LENGTH - 1)]?.focus();
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          maxLength={i === 0 ? CODE_LENGTH : 1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v === "") {
              const next = [...digits];
              next[i] = "";
              onChange(next);
            } else {
              setFrom(i, v.length > 1 && d ? v.replace(d, "") || v : v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              e.preventDefault();
              const next = [...digits];
              next[i - 1] = "";
              onChange(next);
              refs.current[i - 1]?.focus();
            } else if (e.key === "ArrowLeft" && i > 0) {
              refs.current[i - 1]?.focus();
            } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
              refs.current[i + 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            setFrom(0, e.clipboardData.getData("text"));
          }}
          className={`h-14 w-full min-w-0 rounded-2xl border bg-surface-muted text-center text-2xl font-bold tabular-nums transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20 disabled:opacity-60 ${
            invalid ? "border-danger" : "border-border"
          }`}
        />
      ))}
    </div>
  );
}
