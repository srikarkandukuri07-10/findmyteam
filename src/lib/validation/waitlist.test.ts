import { describe, expect, it } from "vitest";
import { inviteMessage, joinResultSchema, ordinal, waitlistSchema } from "./waitlist";

const valid = {
  name: "  Ananya R ",
  email: " Ananya@Example.COM ",
  college: "3",
  collegeOther: "",
  branch: "2",
  year: "3",
  roles: ["1", "4"],
  painPoint: "",
  btech: "on",
  consent: "on",
};

describe("waitlistSchema (WAIT-1)", () => {
  it("accepts a normal sign-up and tidies it", () => {
    const r = waitlistSchema.parse(valid);
    expect(r.name).toBe("Ananya R");
    expect(r.email).toBe("ananya@example.com");
    expect(r.year).toBe(3);
    expect(r.roles).toEqual([1, 4]);
    expect(r.branch).toBe(2);
  });

  it("requires the B.Tech confirmation and consent", () => {
    expect(waitlistSchema.safeParse({ ...valid, btech: undefined }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...valid, consent: undefined }).success).toBe(false);
  });

  it("needs a typed name when the college is 'other'", () => {
    expect(waitlistSchema.safeParse({ ...valid, college: "other", collegeOther: "" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...valid, college: "other", collegeOther: "New Engineering College" }).success).toBe(true);
  });

  it("rejects a college value that is neither an id nor 'other'", () => {
    expect(waitlistSchema.safeParse({ ...valid, college: "drop table" }).success).toBe(false);
  });

  it("rejects bad emails, years and too many roles", () => {
    expect(waitlistSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...valid, year: "7" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...valid, roles: ["1", "2", "3", "4", "5", "6", "7"] }).success).toBe(false);
  });

  it("drops a malformed referral code or source instead of failing", () => {
    const r = waitlistSchema.parse({ ...valid, ref: "<script>", source: "IG Reel!!" });
    expect(r.ref).toBeUndefined();
    expect(r.source).toBeUndefined();
    expect(waitlistSchema.parse({ ...valid, ref: "ABCD2345", source: "ig" })).toMatchObject({ ref: "abcd2345", source: "ig" });
  });

  it("treats an empty branch as not given", () => {
    expect(waitlistSchema.parse({ ...valid, branch: "" }).branch).toBeUndefined();
  });
});

describe("joinResultSchema", () => {
  it("parses every status the database returns", () => {
    expect(joinResultSchema.parse({ status: "joined", code: "abcd2345", position: 4, referrals: 0 }).status).toBe("joined");
    expect(joinResultSchema.parse({ status: "already" }).status).toBe("already");
    expect(joinResultSchema.safeParse({ status: "weird" }).success).toBe(false);
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [112, "112th"],
  ])("%i -> %s", (n, s) => expect(ordinal(n)).toBe(s));
});

describe("inviteMessage", () => {
  it("includes the link", () => {
    expect(inviteMessage("https://x.test/?ref=abcd2345")).toContain("https://x.test/?ref=abcd2345");
  });
});
