import { describe, expect, it } from "vitest";
import { extractHackathon, findDates, findPrizes, plainParagraphs } from "./extract";

const NOW = new Date("2026-11-23T00:00:00Z");

const devfolio = `<html><head><title>haxfinity | Devfolio</title><meta property="og:title" content="haxfinity | Devfolio"/>
<meta name="description" content="HAXFINITY Hack the Infinite The 24-hour hackathon flattened to a single line of text"/></head><body>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: { pageProps: { aggregatePrizeValue: 0, hackathon: {
    name: "haxfinity", is_online: false, team_min: 2, team_max: 4,
    starts_at: "2027-01-03T05:00:00+00:00", ends_at: "2027-01-04T05:00:00+00:00",
    location: "Amal College, Nilambur, Kerala, India",
    desc: "HAXFINITY — Hack the Infinite\n\n3–4 JANUARY 2027\n\nBuild real solutions, solve meaningful problems, and create something that works in 24 hours.\n\nPrizes:Exciting prizes — details to be announced",
  } } },
})}</script><p>Prizes:Exciting prizes — details to be announced Team size:2–4 participants Participation: Free</p></body></html>`;

const devpost = `<html><head><title>Deal Flow</title><meta property="og:title" content="Deal Flow: NYC&#39;s First VC Hackathon @ Betaworks" />
<meta property="og:description" content="Build something VCs want" /><meta property="og:site_name" content="Deal Flow: NYC&#39;s First VC Hackathon @ Betaworks" />
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org", "@type": "Event", name: "Deal Flow: NYC's First VC Hackathon @ Betaworks",
  description: "About the challenge\nVenture capital moves billions of dollars a year on spreadsheets and PDFs. On October 24, 150 founders will fix that in nine hours.",
  startDate: "2026-10-24", endDate: "2026-10-24",
  location: { "@type": "Place", name: "Deal Flow: NYC's First VC Hackathon @ Betaworks", address: { streetAddress: "Little W 12th St", addressLocality: "New York", addressRegion: "NY", addressCountry: "USA" } },
})}</script></head><body><h2>Prizes $ 650 in prizes Grand Winner $ 500 in cash</h2></body></html>`;

describe("extractHackathon (D33)", () => {
  it("reads a Devfolio page from its embedded data", () => {
    const p = extractHackathon(devfolio, "https://haxfinity.devfolio.co/", NOW);
    expect(p).toMatchObject({ name: "haxfinity", startsOn: "2027-01-03", endsOn: "2027-01-04", mode: "offline", teamSize: "2–4", host: "haxfinity.devfolio.co" });
    expect(p.location).toContain("Nilambur");
    expect(p.prizes).toBe("Exciting prizes — details to be announced");
    expect(p.summary).toMatch(/^Build real solutions/);
    expect(p.about).toContain("\n\n");
  });

  it("reads a Devpost-style page from its structured data and text", () => {
    const p = extractHackathon(devpost, "https://nyc-vc-hack.devpost.com/", NOW);
    expect(p.name).toBe("Deal Flow: NYC's First VC Hackathon @ Betaworks");
    expect(p).toMatchObject({ startsOn: "2026-10-24", endsOn: "2026-10-24", prizes: "$650 in prizes", location: "Little W 12th St, New York, NY, USA" });
    expect(p.summary?.startsWith("Build something VCs want.")).toBe(true);
    expect(p.about).not.toMatch(/^About the challenge/i);
  });

  it("falls back to the meta tags and the page text on a plain site", () => {
    const html = `<html><head><title>DevNexus 2.0</title><meta name="description" content="Enter the Castle of DevNexus 2.0. A 24-hour online hackathon with tracks, schedule and rules for all students."></head>
      <body><p>Date: 28-29 November 2026. Prize pool of ₹50,000. Team size: 3-5 members.</p></body></html>`;
    const p = extractHackathon(html, "https://devnexushackathon.in/", NOW);
    expect(p.name).toBe("DevNexus 2.0");
    expect(p).toMatchObject({ startsOn: "2026-11-28", endsOn: "2026-11-29", mode: "online", teamSize: "3–5" });
    expect(p.prizes).toBe("₹50,000 in prizes");
  });

  it("never crashes on junk, and ignores scripts in the page text", () => {
    expect(extractHackathon("", "https://x.com/").name).toBeNull();
    const p = extractHackathon(`<title>T</title><script>var prizes = "$999 in prizes";</script><body>hello</body>`, "https://x.com/", NOW);
    expect(p.prizes).toBeNull();
    expect(extractHackathon("<script type='application/ld+json'>{broken</script>", "https://x.com/").name).toBeNull();
  });
});

describe("findDates", () => {
  it("reads the common ways of writing a date range", () => {
    expect(findDates("Dates: Oct 24, 2026", NOW)).toEqual({ startsOn: "2026-10-24", endsOn: null });
    expect(findDates("starts 28-29 November 2026", NOW)).toEqual({ startsOn: "2026-11-28", endsOn: "2026-11-29" });
    expect(findDates("Dec 12 – Dec 13", NOW)).toEqual({ startsOn: "2026-12-12", endsOn: "2026-12-13" });
  });
  it("assumes the next time round when the year is missing", () => {
    expect(findDates("Date: 5 January", NOW).startsOn).toBe("2027-01-05");
  });
  it("returns nothing when there is no date", () => {
    expect(findDates("no dates here", NOW)).toEqual({ startsOn: null, endsOn: null });
  });
});

describe("findPrizes and plainParagraphs", () => {
  it("finds prize amounts in different phrasings", () => {
    expect(findPrizes("Win prizes worth ₹1,00,000 this season")).toBe("₹1,00,000 in prizes");
    expect(findPrizes("a total prize pool of $ 2,500")).toBe("$2,500 in prizes");
    expect(findPrizes("nothing about money")).toBeNull();
  });
  it("turns markdown into plain paragraphs", () => {
    expect(plainParagraphs("# Title\n\n**Bold** and [a link](https://x.com)\n\n- one\n- two")).toBe("Title\n\nBold and a link\n\n• one\n\n• two");
  });
});
