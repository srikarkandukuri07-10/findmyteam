const COLOURS = ["bg-[#3b3163]", "bg-[#1f1d24]", "bg-[#8f7ac6]", "bg-[#66549f]"];

/** D29: the round badge for a team chat: the team's initials on a colour picked from its id. */
export function TeamBadge({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const colour = COLOURS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % COLOURS.length];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-2xl font-bold text-surface shadow-card ${colour} ${className}`}
    >
      {initials || "T"}
    </span>
  );
}
