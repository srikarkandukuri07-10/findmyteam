import { describe, expect, it } from "vitest";
import { buildHeatmap } from "./heatmap";
import { githubProfileUrl, isGithubUrl, parseGithubSnapshot } from "./snapshot";

describe("buildHeatmap", () => {
  it("pads the first week so days land on their weekday row", () => {
    // 2026-10-28 is a Wednesday (index 3).
    const { weeks } = buildHeatmap({ start: "2026-10-28", counts: [1, 2, 3], levels: ["NONE", "NONE", "NONE"] });
    expect(weeks).toHaveLength(1);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]?.date).toBe("2026-10-28");
    expect(weeks[0][5]?.date).toBe("2026-10-30");
  });

  it("starts a new column every Sunday and numbers days consecutively across months", () => {
    const counts = Array.from({ length: 10 }, (_, i) => i);
    const levels = Array.from({ length: 10 }, () => "NONE");
    const { weeks } = buildHeatmap({ start: "2026-10-25", counts, levels }); // a Sunday
    expect(weeks).toHaveLength(2);
    expect(weeks[0][0]?.date).toBe("2026-10-25");
    expect(weeks[0][6]?.date).toBe("2026-10-31");
    expect(weeks[1][0]?.date).toBe("2026-11-01");
    expect(weeks[1][2]?.count).toBe(9);
  });

  it("maps GitHub's level names and treats unknown ones as empty", () => {
    const { weeks } = buildHeatmap({
      start: "2026-10-25",
      counts: [0, 1, 2, 3, 4, 5],
      levels: ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE", "SOMETHING_NEW"],
    });
    // The last week is not padded, so six days give six cells.
    expect(weeks[0].map((c) => c?.level)).toEqual([0, 1, 2, 3, 4, 0]);
  });

  it("copes with mismatched array lengths and a bad start date", () => {
    // Regression: a malformed start date used to throw "Invalid time value".
    expect(buildHeatmap({ start: "not-a-date", counts: [1, 2], levels: ["NONE", "NONE"] })).toEqual({ weeks: [], months: [] });
    expect(buildHeatmap({ start: "", counts: [1], levels: ["NONE"] })).toEqual({ weeks: [], months: [] });
    const { weeks } = buildHeatmap({ start: "2026-10-25", counts: [1, 2, 3], levels: ["NONE"] });
    expect(weeks.flat().filter(Boolean)).toHaveLength(1);
  });

  it("labels each month once and never crowds labels", () => {
    // A full year, starting on a Sunday.
    const days = 371;
    const { months } = buildHeatmap({
      start: "2025-11-02",
      counts: Array.from({ length: days }, () => 0),
      levels: Array.from({ length: days }, () => "NONE"),
    });
    const labels = months.map((m) => m.label);
    for (let i = 1; i < months.length; i++) expect(months[i].week - months[i - 1].week).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < labels.length; i++) expect(labels[i]).not.toBe(labels[i - 1]);
    expect(labels.length).toBeGreaterThanOrEqual(11);
  });

  it("returns nothing for an empty calendar", () => {
    expect(buildHeatmap({ start: "2026-10-25", counts: [], levels: [] })).toEqual({ weeks: [], months: [] });
  });
});

describe("parseGithubSnapshot", () => {
  const good = {
    login: "octocat",
    public_repos: 8,
    followers: 3,
    contributions_total: 120,
    calendar: { start: "2025-11-02", counts: [0, 1], levels: ["NONE", "FIRST_QUARTILE"] },
    top_repos: [{ name: "hello", description: null, url: "https://github.com/octocat/hello", stars: 2, forks: 0, language: null }],
    languages: [{ name: "Python", repos: 3 }],
    account_created_on: "2019-05-01",
    synced_at: "2026-11-03T10:00:00Z",
  };

  it("accepts a stored snapshot", () => {
    expect(parseGithubSnapshot(good)?.public_repos).toBe(8);
  });

  it("returns null for malformed or missing data instead of throwing", () => {
    expect(parseGithubSnapshot(null)).toBeNull();
    expect(parseGithubSnapshot({})).toBeNull();
    expect(parseGithubSnapshot({ ...good, public_repos: "many" })).toBeNull();
  });
});

describe("github links", () => {
  it("only treats real github.com addresses as links", () => {
    expect(isGithubUrl("https://github.com/octocat/hello")).toBe(true);
    expect(isGithubUrl("https://evil.example/octocat")).toBe(false);
    expect(isGithubUrl("https://github.com.evil.example/x")).toBe(false);
    expect(isGithubUrl("javascript:alert(1)")).toBe(false);
    expect(isGithubUrl("http://github.com/octocat")).toBe(false);
  });

  it("builds a safe profile link", () => {
    expect(githubProfileUrl("octocat")).toBe("https://github.com/octocat");
    expect(githubProfileUrl("a/b")).toBe("https://github.com/a%2Fb");
  });
});
