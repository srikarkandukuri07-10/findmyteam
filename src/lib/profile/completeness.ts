export type CompletenessInput = {
  bio?: string | null;
  skillCount: number;
  roleCount: number;
  /** True only after authorizing GitHub; a typed-in username does not count. */
  githubConnected?: boolean;
  linkedinUrl?: string | null;
};

type Check = { key: string; label: string; weight: number; done: (p: CompletenessInput) => boolean };

/**
 * Weights add up to 100. Name, branch and year are not listed because onboarding already
 * requires them. Photo, projects and past hackathons join this list in Module 3b.
 */
export const CHECKS: Check[] = [
  { key: "skills", label: "Add at least 3 skills", weight: 30, done: (p) => p.skillCount >= 3 },
  { key: "bio", label: "Write a short bio (40+ characters)", weight: 25, done: (p) => (p.bio?.trim().length ?? 0) >= 40 },
  { key: "github", label: "Connect your GitHub", weight: 20, done: (p) => Boolean(p.githubConnected) },
  { key: "roles", label: "Pick the roles you want", weight: 15, done: (p) => p.roleCount >= 1 },
  { key: "linkedin", label: "Add your LinkedIn link", weight: 10, done: (p) => Boolean(p.linkedinUrl) },
];

/** A profile at or above this score counts as "built" on the home checklist. */
export const PROFILE_BUILT_THRESHOLD = 70;

export function profileCompleteness(input: CompletenessInput) {
  const results = CHECKS.map((c) => ({ key: c.key, label: c.label, weight: c.weight, done: c.done(input) }));
  const percent = results.reduce((sum, r) => sum + (r.done ? r.weight : 0), 0);
  return { percent, missing: results.filter((r) => !r.done), done: results.filter((r) => r.done) };
}
