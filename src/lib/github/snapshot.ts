import { z } from "zod";

/** What the database stores about a connected GitHub account (see migration 20261103000004). */
export const githubSnapshotSchema = z.object({
  login: z.string(),
  public_repos: z.number(),
  followers: z.number(),
  contributions_total: z.number(),
  calendar: z.object({
    start: z.string(),
    counts: z.array(z.number()),
    levels: z.array(z.string()),
  }),
  top_repos: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      url: z.string(),
      stars: z.number(),
      forks: z.number(),
      language: z.string().nullable(),
    }),
  ),
  languages: z.array(z.object({ name: z.string(), repos: z.number() })),
  account_created_on: z.string().nullable(),
  synced_at: z.string(),
});

export type GithubSnapshot = z.infer<typeof githubSnapshotSchema>;

/** A malformed snapshot is treated as "no GitHub data" rather than crashing the profile page. */
export function parseGithubSnapshot(value: unknown): GithubSnapshot | null {
  const parsed = githubSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Only links that really point at github.com are rendered as links. */
export function isGithubUrl(url: string): boolean {
  return /^https:\/\/github\.com\/[^\s]+$/.test(url);
}

export function githubProfileUrl(login: string) {
  return `https://github.com/${encodeURIComponent(login)}`;
}
