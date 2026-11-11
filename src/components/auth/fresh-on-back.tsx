"use client";

import { useEffect } from "react";

/**
 * Browsers keep a frozen copy of a page for the back button (bfcache). For sign-in screens that copy is
 * stale: a spinner that never stops, an old email or a half-finished step. When a sign-in screen is
 * shown from that copy, load it fresh instead.
 */
export function FreshOnBack() {
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  return null;
}
