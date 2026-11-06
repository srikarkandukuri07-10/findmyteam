/**
 * Where a student's picture comes from (D21): their uploaded photo in the public "avatars" bucket,
 * or, without one, an illustrated avatar drawn from their id at /avatar/<id>.
 * Safe for client and server code.
 */
const BUCKET = "avatars";

export function avatarSrc(
  id: string,
  avatarPath: string | null | undefined,
  opts: { transparent?: boolean } = {},
): string {
  if (avatarPath) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return `${base}/storage/v1/object/public/${BUCKET}/${avatarPath}`;
  }
  return opts.transparent ? `/avatar/${id}?bg=none` : `/avatar/${id}`;
}

/** Photos are stored square, at this size, as WebP. */
export const AVATAR_SIZE = 512;
export const AVATAR_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
