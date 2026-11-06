import { connectGithub, disconnectGithub } from "@/app/(app)/(shell)/github/actions";
import { githubNotice } from "@/lib/github/notices";
import { githubProfileUrl } from "@/lib/github/snapshot";
import { FormMessage } from "./form";
import { buttonStyles } from "./ui";

/** Message shown after coming back from GitHub (?github=connected, denied, ...). */
export function GithubNotice({ code }: { code: string | string[] | undefined }) {
  const notice = githubNotice(code);
  return notice ? <FormMessage message={notice} /> : null;
}

/**
 * Connect, or disconnect, GitHub. `next` is where to land afterwards.
 * Rendered as its own forms, so place it outside any other <form>.
 */
export function GithubConnectCard({
  username,
  verified,
  next,
}: {
  username: string | null;
  verified: boolean;
  next: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-chip text-lg">
          {"</>"}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">GitHub</h2>
          {verified && username ? (
            <p className="truncate text-sm text-muted">
              Connected as{" "}
              <a
                href={githubProfileUrl(username)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-accent-ink underline-offset-2 hover:underline"
              >
                @{username}
              </a>
            </p>
          ) : (
            <p className="text-sm text-muted">Optional</p>
          )}
        </div>
      </div>

      {verified ? (
        <form action={disconnectGithub}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={buttonStyles.secondary}>
            Disconnect GitHub
          </button>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted">
            Show your contribution graph, repositories and top projects on your profile. We only read public
            information, and you can disconnect any time.
          </p>
          {username && <p className="text-sm text-muted">The username “{username}” on your profile isn&apos;t verified.</p>}
          <form action={connectGithub} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={buttonStyles.primary}>
              Connect GitHub
            </button>
          </form>
          {username && (
            <form action={disconnectGithub}>
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="text-sm font-medium text-muted underline-offset-2 hover:underline">
                Remove the unverified username
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
