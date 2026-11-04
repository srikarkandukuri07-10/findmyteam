"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Fades and slides a block in from the left the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  from = "left",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  from?: "left" | "below";
}) {
  const reduce = useReducedMotion();
  const offset = reduce ? {} : from === "left" ? { x: -36 } : { y: 36 };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 140, damping: 22, delay }}
    >
      {children}
    </motion.div>
  );
}
