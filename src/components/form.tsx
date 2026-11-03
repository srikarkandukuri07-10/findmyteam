"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

const controlClass =
  "block w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 " +
  "aria-[invalid=true]:border-danger";

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Input({ name, error, ...props }: ComponentProps<"input"> & { name: string; error?: string }) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={controlClass}
      {...props}
    />
  );
}

export function Select({
  name,
  error,
  children,
  ...props
}: ComponentProps<"select"> & { name: string; error?: string }) {
  return (
    <select
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={controlClass}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  name,
  error,
  children,
  ...props
}: ComponentProps<"input"> & { name: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-0.5 size-4 shrink-0 accent-accent"
          {...props}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${name}-error`} className="pl-6.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, pendingText }: { children: ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-[background-color,transform] duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ message }: { message?: { ok: boolean; text: string } }) {
  if (!message) return null;
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={`rounded-xl px-3.5 py-2.5 text-sm ${
        message.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {message.text}
    </p>
  );
}
