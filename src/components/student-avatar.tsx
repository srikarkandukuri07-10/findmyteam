import { avatarSrc } from "@/lib/avatar";

const SIZES = {
  xs: "size-8",
  sm: "size-10",
  md: "size-12",
  lg: "size-16",
  xl: "size-28 sm:size-32",
} as const;

/** A student's photo, or their illustrated avatar when they haven't added one (D21). */
export function StudentAvatar({
  id,
  name,
  avatarPath,
  size = "md",
  className = "",
}: {
  id: string;
  name: string;
  avatarPath?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    // A plain <img>: photos and avatars are already small and cached, so the image optimiser adds nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarSrc(id, avatarPath)}
      alt={name}
      width={128}
      height={128}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`${SIZES[size]} shrink-0 rounded-full bg-accent-soft object-cover ring-2 ring-surface ${className}`}
    />
  );
}
