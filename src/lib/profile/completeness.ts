export type CompletenessInput = {
  bio?: string | null;
  skillCount: number;
  roleCount: number;
  /** True only after authorizing GitHub; a typed-in username does not count. */
  githubConnected?: boolean;
  linkedinUrl?: string | null;
  /** The Verified student badge (D25). */
  collegeVerified?: boolean;
  pastHackathons?: number;
  interestCount?: number;
};

type Check = { key: string; label: string; weight: number; done: (p: CompletenessInput) => boolean };

/**
 * Profile strength, also shown as the "Scout boost" meter during onboarding (D26). Weights add up to
 * 100 and follow what Scout rewards: proof of work (GitHub, verified badge, LinkedIn, past hackathons)
 * on top of the required skills and bio.
 */
export const CHECKS: Check[] = [
  { key: "skills", label: "Add at least 3 skills", weight: 20, done: (p) => p.skillCount >= 3 },
  { key: "bio", label: "Write a short bio (40+ characters)", weight: 20, done: (p) => (p.bio?.trim().length ?? 0) >= 40 },
  { key: "github", label: "Connect your GitHub", weight: 15, done: (p) => Boolean(p.githubConnected) },
  { key: "verified", label: "Verify your college email", weight: 15, done: (p) => Boolean(p.collegeVerified) },
  { key: "linkedin", label: "Add your LinkedIn link", weight: 10, done: (p) => Boolean(p.linkedinUrl) },
  { key: "hackathons", label: "Add a past hackathon", weight: 10, done: (p) => (p.pastHackathons ?? 0) >= 1 },
  { key: "roles", label: "Pick the roles you want", weight: 5, done: (p) => p.roleCount >= 1 },
  { key: "interests", label: "Pick your interests", weight: 5, done: (p) => (p.interestCount ?? 0) >= 1 },
];

/** Below this, the home page nudges the student to strengthen their profile. */
export const PROFILE_BUILT_THRESHOLD = 70;

export function profileCompleteness(input: CompletenessInput) {
  const results = CHECKS.map((c) => ({ key: c.key, label: c.label, weight: c.weight, done: c.done(input) }));
  const percent = results.reduce((sum, r) => sum + (r.done ? r.weight : 0), 0);
  return { percent, missing: results.filter((r) => !r.done), done: results.filter((r) => r.done) };
}
