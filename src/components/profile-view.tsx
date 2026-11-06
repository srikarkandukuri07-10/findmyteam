import type { CSSProperties, ReactNode } from "react";
import { githubProfileUrl } from "@/lib/github/snapshot";
import type { ProfileSkill, ProfileView } from "@/lib/profile/data";
import { SKILL_LEVEL_LABELS } from "@/lib/validation/profile";
import { GithubSection } from "./github-section";
import { StudentAvatar } from "./student-avatar";
import { Card, Chip } from "./ui";

const LEVEL_TONE = { advanced: "accent", intermediate: "neutral", beginner: "sand" } as const;

function SkillGroup({ title, skills }: { title: string; skills: ProfileSkill[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <li key={s.id}>
            <Chip tone={LEVEL_TONE[s.level]}>
              {s.name} · {SKILL_LEVEL_LABELS[s.level]}
            </Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A student's profile: a header with cover, photo and an action (Connect, or Edit on my own page),
 * then roles, bio, skills and GitHub. Used for my own page and for other students' pages.
 */
export function ProfileCard({ profile, action }: { profile: ProfileView; action?: ReactNode }) {
  const technical = profile.skills.filter((s) => s.category === "technical");
  const other = profile.skills.filter((s) => s.category === "non_technical");
  const degree = profile.degree === "be" ? "B.E." : "B.Tech";

  return (
    <div className="space-y-4">
      <section className="reveal overflow-hidden rounded-[2rem] bg-surface shadow-card">
        <div
          aria-hidden
          className="relative h-32 overflow-hidden bg-gradient-to-br from-[#3b3163] via-[#66549f] to-accent sm:h-40"
        >
          <div className="drift absolute -left-10 -top-16 size-56 rounded-full bg-accent-soft/30 blur-2xl" />
          <div className="drift-slow absolute -bottom-20 right-10 size-64 rounded-full bg-accent/50 blur-2xl" />
          <svg viewBox="0 0 400 120" className="absolute inset-0 h-full w-full opacity-20" preserveAspectRatio="none">
            <path d="M0 90C80 40 160 110 240 70s120-40 160-20V120H0z" fill="#f6f4e8" />
          </svg>
        </div>
        <div className="px-6 pb-6 sm:px-8">
          <div className="relative z-10 -mt-14 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
            <StudentAvatar
              id={profile.id}
              name={profile.displayName}
              avatarPath={profile.avatarPath}
              size="xl"
              className="pop-in ring-4 shadow-lift"
            />
            {action && <div className="pb-1">{action}</div>}
          </div>
          <div className="mt-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profile.displayName}</h1>
              {profile.isDemo && <Chip>Sample profile</Chip>}
            </div>
            <p className="mt-1 text-muted">
              {degree} · {profile.branchName}
            </p>
            <p className="text-sm text-muted">
              {profile.collegeName} · Year {profile.yearOfStudy} · Graduating {profile.graduationYear}
            </p>
          </div>
        </div>
      </section>
      <Card className="space-y-6 sm:p-8" style={{ "--i": 1 } as CSSProperties}>
        {profile.roles.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Looking to work as</h2>
            <ul className="flex flex-wrap gap-2">
              {profile.roles.map((r) => (
                <li key={r.id}>
                  <Chip tone="accent">{r.name}</Chip>
                </li>
              ))}
            </ul>
          </div>
        )}

        {profile.bio ? (
          <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{profile.bio}</p>
        ) : (
          profile.isMe && <p className="text-sm text-muted">Add a short bio so others know what you want to build.</p>
        )}

        <SkillGroup title="Technical skills" skills={technical} />
        <SkillGroup title="Other skills" skills={other} />
        {profile.skills.length === 0 && profile.isMe && (
          <p className="text-sm text-muted">No skills added yet. Add the skills you bring so teammates can see them.</p>
        )}

        {profile.github && <GithubSection github={profile.github} verified={profile.githubVerified} />}

        {/* A username with no GitHub data behind it is shown as a plain, unverified link. */}
        {((!profile.github && profile.githubUsername) || profile.linkedinUrl) && (
          <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 text-sm">
            {!profile.github && profile.githubUsername && (
              <li>
                <a
                  href={githubProfileUrl(profile.githubUsername)}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-accent-ink underline-offset-2 hover:underline"
                >
                  GitHub · {profile.githubUsername} ↗
                </a>
              </li>
            )}
            {profile.linkedinUrl && (
              <li>
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-accent-ink underline-offset-2 hover:underline"
                >
                  LinkedIn ↗
                </a>
              </li>
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
