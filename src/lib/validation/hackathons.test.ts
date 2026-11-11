import { describe, expect, it } from "vitest";
import { fieldErrors } from "./common";
import { cleanSearchQuery, hackathonSchema } from "./hackathons";

const valid = {
  name: "  Campus Hack 2027 ",
  mode: "hybrid",
  city: "Hyderabad",
  startsOn: "2027-01-16",
  endsOn: "2027-01-18",
  url: "https://example.com/hack",
};

describe("hackathonSchema (HACK-2)", () => {
  it("accepts a complete entry and trims the name", () => {
    expect(hackathonSchema.parse(valid).name).toBe("Campus Hack 2027");
  });

  it("requires the city and the official link", () => {
    const r = hackathonSchema.safeParse({ ...valid, city: " ", url: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error).city).toBeDefined();
      expect(fieldErrors(r.error).url).toBeDefined();
    }
  });

  it.each(["javascript:alert(1)", "ftp://example.com", "example.com", "data:text/html,hi"])(
    "rejects the link %s",
    (url) => {
      expect(hackathonSchema.safeParse({ ...valid, url }).success).toBe(false);
    },
  );

  it("rejects an end date before the start date", () => {
    const r = hackathonSchema.safeParse({ ...valid, startsOn: "2027-01-18", endsOn: "2027-01-16" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).endsOn).toMatch(/before the start/);
  });

  it("rejects a duration that looks like a wrong-year typo", () => {
    const r = hackathonSchema.safeParse({ ...valid, startsOn: "2027-01-16", endsOn: "2028-01-18" });
    expect(r.success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(hackathonSchema.safeParse({ ...valid, startsOn: "2027-02-30", endsOn: "2027-03-01" }).success).toBe(false);
  });

  it("handles a real browser's empty submit, where every field is an empty string", () => {
    // Regression: an empty date used to throw "Invalid time value" instead of returning an error.
    const empty = { name: "", mode: "", city: "", startsOn: "", endsOn: "", url: "" };
    const r = hackathonSchema.safeParse(empty);
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrors(r.error);
      expect(errors.startsOn).toBe("Enter the start date.");
      expect(errors.endsOn).toBe("Enter the end date.");
      expect(errors.name).toBeDefined();
      expect(errors.mode).toBeDefined();
      expect(errors.url).toBeDefined();
    }
  });

  it.each(["2027-13-45", "2027-1-5", "not a date", "0000-00-00", "2027-01-16T10:00"])(
    "reports %s as a bad date instead of throwing",
    (startsOn) => {
      expect(() => hackathonSchema.safeParse({ ...valid, startsOn })).not.toThrow();
      expect(hackathonSchema.safeParse({ ...valid, startsOn }).success).toBe(false);
    },
  );

  it("gives readable messages on an empty submit", () => {
    const r = hackathonSchema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrors(r.error);
      expect(errors).toMatchObject({
        name: expect.any(String),
        mode: "Select how it is held.",
        startsOn: "Enter the start date.",
        endsOn: "Enter the end date.",
      });
      expect(Object.values(errors).join(" ")).not.toMatch(/Invalid input|undefined|NaN/);
    }
  });
});

describe("cleanSearchQuery", () => {
  it("trims, caps and handles arrays and missing values", () => {
    expect(cleanSearchQuery("  sih ")).toBe("sih");
    expect(cleanSearchQuery(["first", "second"])).toBe("first");
    expect(cleanSearchQuery(undefined)).toBe("");
    expect(cleanSearchQuery("x".repeat(200))).toHaveLength(80);
  });
});
