import { describe, expect, it } from "vitest";
import { fieldErrors } from "./common";
import { initials, linkedinSchema, profileSchema, rolesFromForm, skillsFromForm } from "./profile";

const NOW = new Date("2026-11-03T00:00:00Z");
const schema = profileSchema(NOW);

const valid = {
  displayName: "  Asha Rao ",
  bio: "I build ML things.",
  linkedinUrl: "https://www.linkedin.com/in/asha-rao/",
  branchId: "2",
  yearOfStudy: "3",
  graduationYear: "2028",
  skills: [{ id: 1, level: "advanced" }],
  roleIds: [1, 5],
};

describe("profileSchema (PROF-1, PROF-2, PROF-8)", () => {
  it("accepts a complete profile, trims and coerces numbers", () => {
    const r = schema.parse(valid);
    expect(r.displayName).toBe("Asha Rao");
    expect(r.branchId).toBe(2);
    expect(r.graduationYear).toBe(2028);
  });

  it("treats blank optional fields as missing", () => {
    const r = schema.parse({ ...valid, bio: "  ", linkedinUrl: "" });
    expect(r.bio).toBeUndefined();
    expect(r.linkedinUrl).toBeUndefined();
  });

  it("does not accept a GitHub username: GitHub comes only from connecting", () => {
    const r = schema.parse({ ...valid, githubUsername: "someone-else" });
    expect(r).not.toHaveProperty("githubUsername");
  });

  it.each([
    "javascript:alert(1)",
    "http://www.linkedin.com/in/asha",
    "https://evil.example/in/asha",
    "https://linkedin.com.evil.example/in/asha",
    "https://www.linkedin.com/company/acme",
    "https://www.linkedin.com/in/ab",
    "linkedin.com/in/asha",
  ])("rejects the LinkedIn link %s", (linkedinUrl) => {
    expect(schema.safeParse({ ...valid, linkedinUrl }).success).toBe(false);
  });

  it.each(["https://www.linkedin.com/in/asha-rao", "https://in.linkedin.com/in/asha-rao/", "https://linkedin.com/in/asha_rao"])(
    "accepts the LinkedIn link %s",
    (linkedinUrl) => {
      expect(schema.safeParse({ ...valid, linkedinUrl }).success).toBe(true);
    },
  );

  it("enforces the bio, skill and role limits", () => {
    expect(schema.safeParse({ ...valid, bio: "x".repeat(501) }).success).toBe(false);
    expect(schema.safeParse({ ...valid, bio: "x".repeat(500) }).success).toBe(true);
    const sixteen = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, level: "beginner" }));
    expect(schema.safeParse({ ...valid, skills: sixteen }).success).toBe(false);
    expect(schema.safeParse({ ...valid, skills: sixteen.slice(0, 15) }).success).toBe(true);
    expect(schema.safeParse({ ...valid, roleIds: [1, 2, 3, 4] }).success).toBe(false);
  });

  it("rejects unknown skill levels", () => {
    expect(schema.safeParse({ ...valid, skills: [{ id: 1, level: "expert" }] }).success).toBe(false);
  });

  it("allows last year's graduation year but not older ones", () => {
    expect(schema.safeParse({ ...valid, graduationYear: "2025" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, graduationYear: "2024" }).success).toBe(false);
  });

  it("gives readable messages for a browser's empty submit", () => {
    const r = schema.safeParse({
      displayName: "",
      bio: "",
      githubUsername: "",
      linkedinUrl: "",
      branchId: "",
      yearOfStudy: "",
      graduationYear: "",
      skills: [],
      roleIds: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrors(r.error);
      expect(errors).toMatchObject({
        displayName: expect.any(String),
        branchId: "Select your branch.",
        yearOfStudy: "Select your year of study.",
        graduationYear: "Select your graduation year.",
      });
      expect(Object.values(errors).join(" ")).not.toMatch(/Invalid input|NaN|undefined/);
    }
  });
});

describe("linkedinSchema (optional onboarding step)", () => {
  it("lets students skip it", () => {
    expect(linkedinSchema.parse({ linkedinUrl: "" }).linkedinUrl).toBeUndefined();
    expect(linkedinSchema.parse({ linkedinUrl: "   " }).linkedinUrl).toBeUndefined();
    expect(linkedinSchema.parse({}).linkedinUrl).toBeUndefined();
  });

  it("still rejects a wrong link when one is given", () => {
    expect(linkedinSchema.safeParse({ linkedinUrl: "https://evil.example/in/asha" }).success).toBe(false);
    expect(linkedinSchema.safeParse({ linkedinUrl: "https://www.linkedin.com/in/asha-rao" }).success).toBe(true);
  });
});

describe("form parsing helpers", () => {
  it("parses repeated skill fields and flags malformed ones", () => {
    const skills = skillsFromForm(["12:advanced", "3:beginner", "junk"]);
    expect(skills[0]).toEqual({ id: 12, level: "advanced" });
    expect(skills[1]).toEqual({ id: 3, level: "beginner" });
    expect(schema.safeParse({ ...valid, skills }).success).toBe(false); // "junk" has no valid id or level
  });

  it("parses role fields", () => {
    expect(rolesFromForm(["1", "5"])).toEqual([1, 5]);
  });
});

describe("initials", () => {
  it("uses first and last name, and copes with odd input", () => {
    expect(initials("Asha Rao")).toBe("AR");
    expect(initials("  asha  kumar  rao ")).toBe("AR");
    expect(initials("Asha")).toBe("A");
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});
