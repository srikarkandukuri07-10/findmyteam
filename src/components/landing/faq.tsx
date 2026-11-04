"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const QUESTIONS = [
  {
    q: "What is FindMyTeam?",
    a: "A place to find hackathon teammates beyond your friend circle. You see B.Tech and B.E. students from other colleges with their skills, roles and GitHub, swipe right to send a team-up request, or join a team that's already building for your hackathon.",
  },
  {
    q: "Who can join?",
    a: "Students currently pursuing a B.Tech or B.E. degree. There's no age limit.",
  },
  {
    q: "Is it free?",
    a: "Yes. Joining the waitlist and using FindMyTeam is free.",
  },
  {
    q: "When does it launch?",
    a: "Soon. We'll open college by college, starting where the most students are waiting, so a team-up request never goes to an empty app. Inviting friends from your college helps it open there first.",
  },
  {
    q: "What happens to my details?",
    a: "We use them only to invite you when we launch and to decide which colleges open first. They're never shown to anyone, we never ask for your phone number, and you can ask us to delete them at any time.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-3">
      {QUESTIONS.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q} className="overflow-hidden rounded-3xl bg-surface shadow-card">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold"
            >
              {item.q}
              <motion.span
                aria-hidden
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-lg text-accent-ink"
              >
                +
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="a"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <p className="px-6 pb-5 text-muted">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
