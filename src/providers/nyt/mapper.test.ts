import { describe, expect, it } from "vitest";
import { mapNytDoc } from "./mapper";
import type { NytDoc } from "./schema";

const base: NytDoc = {
  _id: "nyt://article/abc",
  web_url: "https://nytimes.com/2026/08/10/science/exoplanet.html",
  abstract: "The planet orbits a quiet red dwarf 41 light years away.",
  snippet: null,
  lead_paragraph: null,
  source: "The New York Times",
  pub_date: "2026-08-10T09:30:00+0000",
  section_name: "Science",
  subsection_name: null,
  news_desk: "Science",
  headline: { main: "Astronomers discover new exoplanet", print_headline: null },
  byline: {
    original: "By Mary Frost and Lucas Ray",
    person: [{ firstname: "Mary", middlename: null, lastname: "Frost" }],
  },
  multimedia: { default: { url: "images/2026/08/10/exoplanet.jpg" }, thumbnail: null },
};

describe("mapNytDoc", () => {
  it("maps a well-formed doc into the domain model", () => {
    const article = mapNytDoc(base);

    expect(article?.sourceId).toBe("nyt");
    expect(article?.title).toBe("Astronomers discover new exoplanet");
    expect(article?.category).toBe("science");
    expect(article?.publishedAt).toBe("2026-08-10T09:30:00.000Z");
  });

  it("prefers the structured person entry over the raw byline string", () => {
    const article = mapNytDoc(base);
    expect(article?.author.name).toBe("Mary Frost");
    expect(article?.author.id).toBe("mary-frost");
  });

  it("falls back to the byline string, keeping only the first author", () => {
    const article = mapNytDoc({ ...base, byline: { ...base.byline, person: [] } });
    expect(article?.author.name).toBe("Mary Frost");
  });

  it("joins a site-relative image path onto the NYT image host", () => {
    expect(mapNytDoc(base)?.image?.url).toBe(
      "https://static01.nyt.com/images/2026/08/10/exoplanet.jpg",
    );
  });

  it("handles the legacy array form of multimedia", () => {
    const article = mapNytDoc({
      ...base,
      multimedia: [
        { url: "images/small.jpg", subtype: "thumbnail" },
        { url: "images/large.jpg", subtype: "xlarge" },
      ],
    });
    expect(article?.image?.url).toBe("https://static01.nyt.com/images/large.jpg");
  });

  it("leaves an already-absolute image url alone", () => {
    const article = mapNytDoc({
      ...base,
      multimedia: { default: { url: "https://cdn.example/a.jpg" }, thumbnail: null },
    });
    expect(article?.image?.url).toBe("https://cdn.example/a.jpg");
  });

  it("tolerates missing multimedia", () => {
    expect(mapNytDoc({ ...base, multimedia: null })?.image).toBeNull();
  });

  it("rejects a doc with no headline", () => {
    expect(mapNytDoc({ ...base, headline: { main: null, print_headline: null } })).toBeNull();
  });

  it("maps Business Day onto economy", () => {
    const article = mapNytDoc({ ...base, section_name: "Business Day", news_desk: "Business" });
    expect(article?.category).toBe("economy");
  });
});
