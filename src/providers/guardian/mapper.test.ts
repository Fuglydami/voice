import { describe, expect, it } from "vitest";
import { mapGuardianResult } from "./mapper";
import type { GuardianResult } from "./schema";

const base: GuardianResult = {
  id: "sport/2026/aug/10/fury-usyk",
  type: "article",
  sectionId: "sport",
  sectionName: "Sport",
  webPublicationDate: "2026-08-10T09:30:00Z",
  webTitle: "Fallback web title",
  webUrl: "https://theguardian.com/sport/2026/aug/10/fury-usyk",
  fields: {
    headline: "Will he retire? One more loss and Fury is finished",
    trailText: "<b>The Usyk vs Fury fight</b> is on the horizon.",
    byline: "Adam Strong",
    thumbnail: "https://media.guim.co.uk/thumb.jpg",
  },
  tags: [
    {
      id: "profile/adamstrong",
      type: "contributor",
      webTitle: "Adam Strong",
      bylineImageUrl: "https://uploads.guim.co.uk/adam.png",
    },
  ],
};

describe("mapGuardianResult", () => {
  it("maps a well-formed result into the domain model", () => {
    const article = mapGuardianResult(base);

    expect(article?.sourceId).toBe("guardian");
    expect(article?.publication).toBe("The Guardian");
    expect(article?.title).toBe("Will he retire? One more loss and Fury is finished");
    expect(article?.excerpt).toBe("The Usyk vs Fury fight is on the horizon.");
  });

  it("trusts the section name over any keyword in the headline", () => {
    expect(mapGuardianResult(base)?.category).toBe("sports");
  });

  it("prefers the contributor tag for the byline, and takes its headshot", () => {
    const article = mapGuardianResult(base);
    expect(article?.author.name).toBe("Adam Strong");
    expect(article?.author.id).toBe("adam-strong");
    expect(article?.author.avatarUrl).toBe("https://uploads.guim.co.uk/adam.png");
  });

  it("falls back to the byline field when there is no contributor tag", () => {
    const article = mapGuardianResult({ ...base, tags: [] });
    expect(article?.author.name).toBe("Adam Strong");
    expect(article?.author.avatarUrl).toBe(null);
  });

  it("falls back to the publication when there is no byline at all", () => {
    const article = mapGuardianResult({
      ...base,
      tags: [],
      fields: { ...base.fields, byline: null },
    });
    expect(article?.author.name).toBe("The Guardian");
  });

  it("falls back to webTitle when the headline field is absent", () => {
    const article = mapGuardianResult({ ...base, fields: { ...base.fields, headline: null } });
    expect(article?.title).toBe("Fallback web title");
  });

  it("rejects a result with no url", () => {
    expect(mapGuardianResult({ ...base, webUrl: null })).toBeNull();
  });

  it("maps the society section onto health", () => {
    const article = mapGuardianResult({
      ...base,
      sectionId: "society",
      sectionName: "Society",
      fields: { ...base.fields, headline: "Hospital waiting lists fall" },
    });
    expect(article?.category).toBe("health");
  });
});

/**
 * The Guardian returns far more than the original mapper consumed. These cover
 * the fields added once we audited the payload: real image metadata, live-blog
 * state, word count, tone and topic tags.
 */
describe("mapGuardianResult: fields recovered from the full payload", () => {
  const rich: GuardianResult = {
    ...base,
    pillarName: "News",
    fields: {
      ...base.fields,
      wordcount: "3122",
      standfirst: "<p>A standfirst comfortably longer than the sixty-character threshold that decides which summary wins.</p>",
      lastModified: "2026-08-10T11:30:00Z",
      firstPublicationDate: "2026-08-10T09:30:00Z",
      isLive: "true",
      liveBloggingNow: "true",
    },
    elements: [
      {
        type: "image",
        relation: "main",
        assets: [
          { file: "https://media.guim.co.uk/small.jpg", typeData: { width: 500 } },
          {
            file: "https://media.guim.co.uk/large.jpg",
            typeData: {
              width: 1000,
              height: 600,
              altText: "A runner crossing the finish line",
              caption: "Kate O'Connor takes gold in Birmingham",
              credit: "Tom Jenkins/The Guardian",
              secureFile: "https://media.guim.co.uk/large-secure.jpg",
            },
          },
        ],
      },
    ],
    tags: [
      ...(base.tags ?? []),
      { id: "tone/comment", type: "tone", webTitle: "Comment" },
      { id: "sport/athletics", type: "keyword", webTitle: "Athletics" },
      { id: "sport/sport", type: "keyword", webTitle: "Sport" },
    ],
  };

  it("maps real alt text, caption and photographer credit", () => {
    const image = mapGuardianResult(rich)?.image;

    expect(image?.alt).toBe("A runner crossing the finish line");
    expect(image?.caption).toBe("Kate O'Connor takes gold in Birmingham");
    expect(image?.credit).toBe("Tom Jenkins/The Guardian");
  });

  it("carries image dimensions, so the layout need not guess an aspect ratio", () => {
    expect(mapGuardianResult(rich)?.image).toMatchObject({ width: 1000, height: 600 });
  });

  it("prefers the secure file over the plain one", () => {
    expect(mapGuardianResult(rich)?.image?.url).toBe("https://media.guim.co.uk/large-secure.jpg");
  });

  /**
   * Regression. A portrait crop can offer 333px and 4000px and nothing between.
   * Choosing simply the widest asset under a cap picked the 333px one, which
   * renders visibly soft in a card.
   */
  it("skips assets too small to fill a card", () => {
    const article = mapGuardianResult({
      ...rich,
      elements: [
        {
          type: "image",
          relation: "main",
          assets: [
            { file: "https://media.guim.co.uk/tiny.jpg", typeData: { width: 333 } },
            { file: "https://media.guim.co.uk/huge.jpg", typeData: { width: 4000 } },
          ],
        },
      ],
    });

    expect(article?.image?.url).toBe("https://media.guim.co.uk/huge.jpg");
  });

  it("falls back to the largest available when every asset is small", () => {
    const article = mapGuardianResult({
      ...rich,
      elements: [
        {
          type: "image",
          relation: "main",
          assets: [
            { file: "https://media.guim.co.uk/a.jpg", typeData: { width: 140 } },
            { file: "https://media.guim.co.uk/b.jpg", typeData: { width: 300 } },
          ],
        },
      ],
    });

    expect(article?.image?.url).toBe("https://media.guim.co.uk/b.jpg");
  });

  it("falls back to the flat thumbnail when there is no image element", () => {
    const image = mapGuardianResult({ ...rich, elements: [] })?.image;
    expect(image?.url).toBe("https://media.guim.co.uk/thumb.jpg");
    expect(image?.alt).toBeNull();
  });

  it("detects a running live blog", () => {
    const article = mapGuardianResult(rich);
    expect(article?.isLive).toBe(true);
    expect(article?.kind).toBe("live");
  });

  /**
   * Regression. The Guardian has two similarly named fields: `liveBloggingNow`
   * means "this is a running live blog", while `isLive` merely means "published
   * rather than draft" and is true for essentially everything. Reading `isLive`
   * marked the entire feed as live.
   */
  it("does not treat the published flag as a live blog", () => {
    const article = mapGuardianResult({
      ...rich,
      fields: { ...rich.fields, isLive: "true", liveBloggingNow: "false" },
    });

    expect(article?.isLive).toBe(false);
    expect(article?.kind).not.toBe("live");
  });

  it("surfaces a later modification time for live blogs", () => {
    expect(mapGuardianResult(rich)?.updatedAt).toBe("2026-08-10T11:30:00.000Z");
  });

  it("ignores a modification time within a minute of publication", () => {
    const article = mapGuardianResult({
      ...rich,
      fields: { ...rich.fields, lastModified: "2026-08-10T09:30:30Z" },
    });
    expect(article?.updatedAt).toBeNull();
  });

  it("reads the word count for a reading-time estimate", () => {
    expect(mapGuardianResult(rich)?.wordCount).toBe(3122);
  });

  it("maps tone tags onto the article kind", () => {
    const article = mapGuardianResult({
      ...rich,
      fields: { ...rich.fields, liveBloggingNow: "false" },
    });
    expect(article?.kind).toBe("opinion");
  });

  it("collects keyword tags as topics", () => {
    expect(mapGuardianResult(rich)?.topics).toEqual(["Athletics", "Sport"]);
  });

  it("prefers the standfirst over the trail text when it is substantial", () => {
    expect(mapGuardianResult(rich)?.excerpt).toBe(
      "A standfirst comfortably longer than the sixty-character threshold that decides which summary wins.",
    );
  });

  it("uses the Guardian path id as the provider reference", () => {
    expect(mapGuardianResult(rich)?.providerRef).toBe("sport/2026/aug/10/fury-usyk");
  });
});

describe("mapGuardianResult: excerpt fallback", () => {
  it("falls back to the trail text when the standfirst is a stub", () => {
    // Live blogs often carry a standfirst that is just a bulleted list of
    // links, which strips down to almost nothing.
    const article = mapGuardianResult({
      ...base,
      fields: { ...base.fields, standfirst: "<ul><li><p>Live updates</p></li></ul>" },
    });

    expect(article?.excerpt).toBe("The Usyk vs Fury fight is on the horizon.");
  });
});
