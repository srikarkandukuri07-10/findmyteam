import { githubProfileUrl } from "@/lib/github/snapshot";
import type { ProfileSkill, ProfileView } from "@/lib/profile/data";
import { SKILL_LEVEL_LABELS, initials } from "@/lib/validation/profile";
import { GithubSection } from "./github-section";
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

/** A student's profile. Used for my own page and for other students' pages. */
export function ProfileCard({ profile }: { profile: ProfileView }) {
  const technical = profile.skills.filter((s) => s.category === "technical");
  const other = profile.skills.filter((s) => s.category === "non_technical");
  const degree = profile.degree === "be" ? "B.E." : "B.Tech";

  return (
    <Card className="space-y-6 sm:p-8">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-full bg-accent-soft text-xl font-semibold text-accent"
        >
          {initials(profile.displayName)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.displayName}</h1>
          <p className="text-sm text-muted">
            {degree} · {profile.branchName}
          </p>
          <p className="text-sm text-muted">
            {profile.collegeName} · Year {profile.yearOfStudy} · Graduating {profile.graduationYear}
          </p>
        </div>
      </div>

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
                className="font-medium text-accent underline-offset-2 hover:underline"
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
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                LinkedIn ↗
              </a>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
