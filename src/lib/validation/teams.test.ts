import { describe, expect, it } from "vitest";
import { fieldErrors } from "./common";
import { createTeamSchema, joinNoteSchema } from "./teams";

const valid = {
  hackathonName: "  Smart   India Hackathon 2027 ",
  mode: "offline",
  teamSize: "4",
  about: "Agritech track: build tools that help farmers price their crops.",
  lookingFor: "A designer and a backend developer",
};

describe("createTeamSchema (D29)", () => {
  it("accepts a complete team and tidies the hackathon name", () => {
    const t = createTeamSchema.parse(valid);
    expect(t.hackathonName).toBe("Smart India Hackathon 2027");
    expect(t.teamSize).toBe(4);
  });

  it("requires every field", () => {
    const r = createTeamSchema.safeParse({ hackathonName: " ", mode: "", teamSize: "", about: "", lookingFor: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(
        ["about", "hackathonName", "lookingFor", "mode", "teamSize"].sort(),
      );
    }
  });

  it("only allows online or offline", () => {
    expect(createTeamSchema.safeParse({ ...valid, mode: "hybrid" }).success).toBe(false);
  });

  it("keeps the team between 2 and 10 people, leader included", () => {
    expect(createTeamSchema.safeParse({ ...valid, teamSize: "1" }).success).toBe(false);
    expect(createTeamSchema.safeParse({ ...valid, teamSize: "11" }).success).toBe(false);
    expect(createTeamSchema.safeParse({ ...valid, teamSize: "2" }).success).toBe(true);
  });
});

describe("joinNoteSchema (D29)", () => {
  it("is optional and capped at 300 characters", () => {
    expect(joinNoteSchema.parse(undefined)).toBe("");
    expect(joinNoteSchema.safeParse("x".repeat(301)).success).toBe(false);
  });
});
