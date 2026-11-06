"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { setAvatar } from "@/app/(app)/(shell)/profile/photo-actions";
import { AVATAR_MAX_UPLOAD_BYTES, AVATAR_SIZE, avatarSrc } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "done"; label: string }
  | { kind: "error"; label: string };

/** Crops the middle square of an image and returns it as a 512 x 512 WebP. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("encode");
  return blob;
}

function randomName() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** PROF-1: add, change or remove my profile photo. Without one, my illustrated avatar is shown. */
export function PhotoUploader({
  userId,
  name,
  avatarPath,
}: {
  userId: string;
  name: string;
  avatarPath: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(avatarPath);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const removeFile = async (p: string | null) => {
    if (p) await createClient().storage.from("avatars").remove([p]);
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setStatus({ kind: "error", label: "Pick an image file." });
    if (file.size > AVATAR_MAX_UPLOAD_BYTES) return setStatus({ kind: "error", label: "That image is over 8 MB." });

    setStatus({ kind: "working", label: "Preparing your photo…" });
    try {
      const blob = await toSquareWebp(file);
      setPreview(URL.createObjectURL(blob));
      setStatus({ kind: "working", label: "Uploading…" });
      const next = `${userId}/${randomName()}.webp`;
      const { error } = await createClient().storage.from("avatars").upload(next, blob, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      const saved = await setAvatar(next);
      if (!saved.ok) {
        await removeFile(next);
        throw new Error("save");
      }
      await removeFile(saved.previous);
      setPath(next);
      setStatus({ kind: "done", label: "Photo updated" });
      router.refresh();
    } catch {
      setPreview(null);
      setStatus({ kind: "error", label: "Couldn't upload that photo. Try another one." });
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const onRemove = async () => {
    setStatus({ kind: "working", label: "Removing…" });
    const saved = await setAvatar(null);
    if (!saved.ok) return setStatus({ kind: "error", label: "Couldn't remove it. Try again." });
    await removeFile(saved.previous);
    setPath(null);
    setPreview(null);
    setStatus({ kind: "done", label: "Photo removed" });
    router.refresh();
  };

  const src = preview ?? avatarSrc(userId, path);
  const working = status.kind === "working";

  return (
    <div className="flex flex-wrap items-center gap-5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={working}
        className="group relative size-24 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
        aria-label="Change profile photo"
      >
        <AnimatePresence mode="popLayout">
          <motion.img
            key={src}
            src={src}
            alt={name}
            initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="size-24 rounded-full bg-accent-soft object-cover shadow-card ring-4 ring-surface"
          />
        </AnimatePresence>
        <span className="absolute inset-0 grid place-items-center rounded-full bg-foreground/45 text-xs font-bold text-surface opacity-0 transition group-hover:opacity-100">
          Change
        </span>
        {working && (
          <span
            aria-hidden
            className="absolute -inset-1 animate-spin rounded-full border-4 border-accent border-t-transparent"
          />
        )}
      </button>
      <div className="space-y-2">
        <p className="font-semibold">Profile photo</p>
        <p className="max-w-xs text-sm text-muted">
          A clear photo of your face helps teammates trust a request. Without one, everyone sees your illustrated
          avatar.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={working}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover active:scale-95 disabled:opacity-60"
          >
            {path ? "Change photo" : "Upload photo"}
          </button>
          {path && (
            <button
              type="button"
              onClick={onRemove}
              disabled={working}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          {status.kind !== "idle" && (
            <motion.p
              key={status.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              role={status.kind === "error" ? "alert" : "status"}
              className={`text-sm font-medium ${status.kind === "error" ? "text-danger" : status.kind === "done" ? "text-success" : "text-muted"}`}
            >
              {status.label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
