import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Cream card on the lavender page, the base building block of every screen. */
export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-3xl bg-surface p-6 shadow-card ${className}`} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-medium tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/** Grey pill for statuses and tags. `tone="accent"` for the selected/positive variant. */
export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "sand" | "success";
}) {
  const tones = {
    neutral: "bg-chip text-foreground",
    accent: "bg-accent-soft text-accent",
    sand: "bg-sand text-foreground",
    success: "bg-success-soft text-success",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** A big soft-purple number with a label, as on a dashboard tile. */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="flex flex-col justify-between gap-3">
      <p className="text-base">{label}</p>
      <p className="text-4xl font-semibold tracking-tight text-accent-strong">{value}</p>
    </Card>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors";
export const buttonStyles = {
  primary: `${buttonBase} bg-accent text-accent-foreground hover:bg-accent-hover`,
  secondary: `${buttonBase} bg-chip text-foreground hover:bg-accent-soft`,
  ghost: `${buttonBase} text-muted hover:bg-surface-muted hover:text-foreground`,
};

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link className={`${buttonStyles[variant]} ${className}`} {...props} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
