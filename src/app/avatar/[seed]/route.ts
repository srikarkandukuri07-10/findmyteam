import { createAvatar } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";
import { z } from "zod";

/** Soft backgrounds from the FMT palette. */
const BACKGROUNDS = ["e4ddf0", "d9cdf0", "e9e4d0", "f2e6f7", "dcd5ec"];

/**
 * An illustrated avatar for a student without a photo (D21): the same picture for the same id, always.
 * Art: DiceBear "Notionists" by Zoish, CC0 1.0.
 */
export async function GET(_request: Request, ctx: RouteContext<"/avatar/[seed]">) {
  const { seed } = await ctx.params;
  const parsed = z.uuid().safeParse(seed);
  if (!parsed.success) return new Response("Not found", { status: 404 });

  const svg = createAvatar(notionists, {
    seed: parsed.data,
    backgroundColor: BACKGROUNDS,
    backgroundType: ["solid"],
    scale: 110,
    translateY: 4,
  }).toString();

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
