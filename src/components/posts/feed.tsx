import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
import { listPostableTeams, listPosts } from "@/lib/posts/data";
import { getShellInfo } from "@/lib/shell/data";

/** Home's middle: the "What type of teammates are you looking for?" box, then everyone's posts. */
export async function PostsFeed() {
  const [posts, teams, info] = await Promise.all([listPosts(20), listPostableTeams(), getShellInfo()]);
  return (
    <div className="min-w-0 space-y-4">
      <PostComposer me={{ id: info.id, name: info.name, avatarPath: info.avatarPath }} teams={teams} />
      {posts.length === 0 ? (
        <p className="rounded-[2rem] bg-surface p-6 text-center text-sm text-muted shadow-card">
          No posts yet. Be the first to say what kind of teammates you&apos;re looking for.
        </p>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
