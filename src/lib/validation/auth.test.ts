import { describe, expect, it } from "vitest";
import { logInSchema } from "./auth";

describe("logInSchema (local test accounts, D25)", () => {
  it("normalises email case and whitespace", () => {
    const r = logInSchema.parse({ email: " Asha@Example.COM ", password: "x" });
    expect(r.email).toBe("asha@example.com");
  });

  it("requires a password", () => {
    const r = logInSchema.safeParse({ email: "a@b.co", password: "" });
    expect(r.success).toBe(false);
  });
});
