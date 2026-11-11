import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";
import { StudentAvatar } from "@/components/student-avatar";
import { HackathonLink, SeatMeter } from "@/components/teams/team-cards";
import {
  JoinButton,
  LeadActions,
  LeaveTeamButton,
  RemoveMemberButton,
  RequestsPanel,
} from "@/components/teams/team-controls";
import { buttonStyles, Card, Chip } from "@/components/ui";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { sinceLabel } from "@/lib/teams/format";
import { MODE_LABELS, RECRUIT_LABELS, getTeam } from "@/lib/teams/data";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage(props: PageProps<"/teams/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <Link href="/teams" className="inline-block text-sm font-medium text-foreground hover:text-accent-ink">
        ← Teams
      </Link>
      <Suspense fallback={<CardSkeleton lines={6} />}>
        <TeamDetails params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

function memberLine(roles: string[], college: string | null, year: number | null) {
  return [roles.slice(0, 2).join(", "), college, year ? `Year ${year}` : null].filter(Boolean).join(" · ");
}

async function TeamDetails({
  params,
  searchParams,
}: {
  params: PageProps<"/teams/[id]">["params"];
  searchParams: PageProps<"/teams/[id]">["searchParams"];
}) {
  const { id: userId } = await requireOnboardedProfile();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const team = await getTeam(id);
  if (!team) notFound();

  const lead = team.members.find((m) => m.is_owner);
  const leadName = lead?.name.split(" ")[0] ?? "the lead";
  const full = team.members.length >= team.teamSize;
  const recruiting = !team.completed && (team.recruitStatus === "open" || team.recruitStatus === "partially_filled");

  return (
    <>
      {sp.created === "1" && team.isOwner && (
        <p role="status" className="reveal rounded-2xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
          Team created. Your team chat is ready in Messages, and people you accept join it straight away.
        </p>
      )}

      <Card className="space-y-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {team.completed ? (
            <Chip tone="success">Completed</Chip>
          ) : (
            <Chip tone={recruiting ? "accent" : "neutral"}>{RECRUIT_LABELS[team.recruitStatus]}</Chip>
          )}
          <Chip tone="sand">{MODE_LABELS[team.mode]}</Chip>
          {team.isOwner && <Chip tone="accent">You lead this team</Chip>}
          {team.isMember && !team.isOwner && <Chip>You&apos;re a member</Chip>}
          {team.isDemo && <Chip>Sample</Chip>}
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{team.hackathonName}</h1>
          {lead && (
            <p className="text-sm text-muted">
              Led by{" "}
              <Link href={`/students/${lead.id}`} className="font-medium text-foreground hover:underline">
                {lead.name}
              </Link>{" "}
              · created {sinceLabel(team.createdAt)}
            </p>
          )}
        </div>
        <HackathonLink url={team.hackathonUrl} className="px-4 py-2 text-sm" />
        <SeatMeter count={team.members.length} size={team.teamSize} />

        <div className="flex flex-wrap items-center gap-2">
          {team.isMember && team.conversationId ? (
            <Link href={`/messages/${team.conversationId}`} className={buttonStyles.primary}>
              Open team chat
            </Link>
          ) : (
            <JoinButton teamId={team.id} myRequest={team.myRequest} isDemo={team.isDemo} canJoin={recruiting} />
          )}
        </div>
        {team.isOwner && !team.completed && (
          <LeadActions teamId={team.id} recruiting={recruiting} canReopen={!full} />
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">What it&apos;s about</h2>
          <p className="mt-1 whitespace-pre-line leading-relaxed">{team.about}</p>
        </div>
        <div className="rounded-2xl bg-surface-muted p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Who we&apos;re looking for</h2>
          <p className="mt-1 whitespace-pre-line">{team.lookingFor}</p>
        </div>
      </Card>

      {team.isMember && !team.completed && (
        <Card id="requests" className="scroll-mt-24 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium tracking-tight">Join requests ({team.requests.length})</h2>
            {!team.isOwner && <span className="text-xs text-muted">{leadName} decides</span>}
          </div>
          <RequestsPanel
            teamId={team.id}
            isOwner={team.isOwner}
            leadName={leadName}
            full={full}
            requests={team.requests.map((r) => ({
              id: r.id,
              userId: r.user_id,
              name: r.name,
              avatarPath: r.avatar_path,
              detail: memberLine(r.roles, r.college, r.year),
              note: r.note,
              when: `asked ${sinceLabel(r.created_at)}`,
            }))}
          />
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">
          Members ({team.members.length}/{team.teamSize})
        </h2>
        <ul className="stagger space-y-3">
          {team.members.map((m) => (
            <li key={m.id} className="reveal flex items-center gap-2 rounded-2xl bg-surface-muted p-3">
              <Link href={`/students/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <StudentAvatar id={m.id} name={m.name} avatarPath={m.avatar_path} size="sm" className="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="truncate hover:underline">{m.name}</span>
                    {m.is_owner && <Chip tone="accent">Lead</Chip>}
                    {m.id === userId && !m.is_owner && <Chip>You</Chip>}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {[memberLine(m.roles, m.college, m.year), m.is_owner ? null : `joined ${sinceLabel(m.joined_at)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
              {team.isOwner && !m.is_owner && <RemoveMemberButton teamId={team.id} userId={m.id} name={m.name} />}
            </li>
          ))}
        </ul>
        {team.isMember && !team.isOwner && (
          <div className="flex justify-end">
            <LeaveTeamButton teamId={team.id} />
          </div>
        )}
      </Card>
    </>
  );
}
