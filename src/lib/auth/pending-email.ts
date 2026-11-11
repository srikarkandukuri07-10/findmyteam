import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

/**
 * The email waiting for its code, between /login and /login/code (D27). Kept in a short-lived,
 * http-only cookie so it never appears in the address bar or browser history.
 */
const PENDING_EMAIL_COOKIE = "fmt_pending_email";

export const emailField = z.string().trim().toLowerCase().max(254).pipe(z.email({ error: "Enter a valid email address." }));

export async function readPendingEmail() {
  const v = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  const parsed = emailField.safeParse(v ?? "");
  return parsed.success ? parsed.data : null;
}

export async function setPendingEmail(email: string) {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });
}

export async function clearPendingEmail() {
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
}
