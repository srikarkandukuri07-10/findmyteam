import { z } from "zod";

/** Empty or whitespace-only form values become `undefined`, so "required" errors read naturally. */
export const blankToUndefined = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") ? undefined : v;

/** A required whole number from a form field, with one message for missing or invalid input. */
export function requiredInt(message: string) {
  return z.preprocess(blankToUndefined, z.coerce.number({ error: message }).int({ error: message }));
}

/** Field name -> first error message, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
