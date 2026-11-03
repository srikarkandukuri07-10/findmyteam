import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  onboardingSchema,
  resetPasswordSchema,
  signUpSchema,
} from "./auth";

const NOW = new Date("2026-11-03T00:00:00Z");

const validOnboarding = {
  displayName: "  Asha Rao ",
  degree: "btech",
  collegeId: "3",
  collegeOther: "",
  branchId: "1",
  yearOfStudy: "2",
  graduationYear: "2029",
  birthYear: "2007",
  confirmDegree: "on",
  acceptTerms: "on",
};

describe("signUpSchema (AUTH-1)", () => {
  it("normalises email case and whitespace", () => {
    const r = signUpSchema.parse({ email: " Asha@Example.COM ", password: "longenough" });
    expect(r.email).toBe("asha@example.com");
  });

  it("rejects short passwords", () => {
    const r = signUpSchema.safeParse({ email: "a@b.co", password: "short" });
    expect(r.success).toBe(false);
  });

  it("rejects passwords over bcrypt's 72-byte limit", () => {
    const r = signUpSchema.safeParse({ email: "a@b.co", password: "x".repeat(73) });
    expect(r.success).toBe(false);
  });
});

describe("resetPasswordSchema (AUTH-6)", () => {
  it("requires matching passwords", () => {
    const r = resetPasswordSchema.safeParse({ password: "longenough", confirmPassword: "different" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).confirmPassword).toMatch(/match/);
  });
});

describe("onboardingSchema (AUTH-7)", () => {
  const schema = onboardingSchema(NOW);

  it("accepts a complete B.Tech declaration and coerces numbers", () => {
    const r = schema.parse(validOnboarding);
    expect(r).toMatchObject({
      displayName: "Asha Rao",
      collegeId: 3,
      branchId: 1,
      yearOfStudy: 2,
      graduationYear: 2029,
      birthYear: 2007,
    });
  });

  it("allows students under 18 (DECISIONS D4)", () => {
    expect(schema.safeParse({ ...validOnboarding, birthYear: "2010" }).success).toBe(true);
  });

  it("accepts B.E. as well as B.Tech (DECISIONS D6)", () => {
    expect(schema.safeParse({ ...validOnboarding, degree: "be" }).success).toBe(true);
    expect(schema.safeParse({ ...validOnboarding, degree: "bsc" }).success).toBe(false);
  });

  it("requires the B.Tech confirmation and terms checkboxes", () => {
    const r = schema.safeParse({ ...validOnboarding, confirmDegree: undefined, acceptTerms: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrors(r.error);
      expect(errors.confirmDegree).toBeDefined();
      expect(errors.acceptTerms).toBeDefined();
    }
  });

  it("accepts an unlisted college typed in instead of picked", () => {
    const r = schema.parse({ ...validOnboarding, collegeId: "other", collegeOther: "Some New College" });
    expect(r.collegeId).toBe("other");
    expect(r.collegeOther).toBe("Some New College");
  });

  it("requires the typed name when the college isn't listed", () => {
    const r = schema.safeParse({ ...validOnboarding, collegeId: "other", collegeOther: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).collegeOther).toBeDefined();
  });

  it("shows a readable error for every missing field on an empty submit", () => {
    const r = schema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrors(r.error);
      expect(errors).toMatchObject({
        displayName: expect.any(String),
        degree: "Select your degree.",
        collegeId: "Select your college.",
        branchId: "Select your branch.",
        yearOfStudy: "Select your year of study.",
        graduationYear: "Select your graduation year.",
        birthYear: "Enter your birth year.",
      });
      expect(Object.values(errors).join(" ")).not.toMatch(/NaN|Invalid input/);
    }
  });

  it("rejects graduation years already in the past", () => {
    expect(schema.safeParse({ ...validOnboarding, graduationYear: "2025" }).success).toBe(false);
  });
});
