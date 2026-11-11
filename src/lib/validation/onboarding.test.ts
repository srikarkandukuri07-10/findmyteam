import { describe, expect, it } from "vitest";
import { detailsSchema, greatAtSchema, pastHackathonSchema, phoneField } from "./onboarding";

const NOW = new Date("2026-11-11T00:00:00Z");
const card1 = {
  displayName: "  Asha Rao ",
  phone: "98765 43210",
  college: "  Vasavi   College of Engineering ",
  degree: "btech",
  branchId: "1",
  yearOfStudy: "2",
  graduationYear: "2029",
  birthYear: "2007",
  confirmDegree: "on",
  acceptTerms: "on",
};

describe("phoneField (D26)", () => {
  it("normalises Indian mobile numbers to +91", () => {
    for (const v of ["9876543210", "98765 43210", "+91 98765-43210", "919876543210"]) {
      expect(phoneField.parse(v)).toBe("+919876543210");
    }
  });
  it("rejects numbers that aren't Indian mobiles", () => {
    for (const v of ["12345", "5876543210", "+1 4155552671", ""]) expect(phoneField.safeParse(v).success).toBe(false);
  });
});

describe("detailsSchema (Card 1, AUTH-7)", () => {
  it("accepts a complete card and coerces numbers", () => {
    const r = detailsSchema(NOW).parse(card1);
    expect(r).toMatchObject({ displayName: "Asha Rao", phone: "+919876543210", college: "Vasavi College of Engineering", birthYear: 2007 });
  });
  it("requires a college name", () => {
    expect(detailsSchema(NOW).safeParse({ ...card1, college: " " }).success).toBe(false);
    expect(detailsSchema(NOW).safeParse({ ...card1, college: "ab" }).success).toBe(false);
  });
  it("requires the B.Tech declaration and consent", () => {
    expect(detailsSchema(NOW).safeParse({ ...card1, confirmDegree: undefined }).success).toBe(false);
    expect(detailsSchema(NOW).safeParse({ ...card1, acceptTerms: undefined }).success).toBe(false);
  });
});

describe("greatAtSchema (Card 2)", () => {
  const skills = [1, 2, 3].map((id) => ({ id, level: "advanced" as const }));
  it("needs a 40+ character bio and 3 skills", () => {
    expect(greatAtSchema.safeParse({ bio: "x".repeat(39), skills, roleIds: [], interests: [] }).success).toBe(false);
    expect(greatAtSchema.safeParse({ bio: "x".repeat(40), skills: skills.slice(0, 2), roleIds: [], interests: [] }).success).toBe(false);
    expect(greatAtSchema.safeParse({ bio: "x".repeat(40), skills, roleIds: [], interests: ["ai-ml"] }).success).toBe(true);
  });
  it("rejects unknown interests", () => {
    expect(greatAtSchema.safeParse({ bio: "x".repeat(40), skills, roleIds: [], interests: ["astrology"] }).success).toBe(false);
  });
});

describe("pastHackathonSchema (Card 3)", () => {
  it("accepts a win with https links and rejects http or future years", () => {
    const s = pastHackathonSchema(NOW);
    expect(s.safeParse({ name: "Smart Build", year: "2025", result: "winner", liveUrl: "https://a.example/app" }).success).toBe(true);
    expect(s.safeParse({ name: "Smart Build", year: "2025", result: "winner", liveUrl: "http://a.example" }).success).toBe(false);
    expect(s.safeParse({ name: "Smart Build", year: "2027", result: "participated" }).success).toBe(false);
  });
});
