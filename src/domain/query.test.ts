import { describe, expect, it } from "vitest";
import { isEmptyQuery, parseArticleQuery, serializeArticleQuery } from "./query";

describe("parseArticleQuery", () => {
  it("applies defaults for an empty request", () => {
    const query = parseArticleQuery(new URLSearchParams());

    expect(query).toMatchObject({ q: "", page: 1, pageSize: 12, sort: "newest" });
    expect(query.categories).toEqual([]);
    expect(query.sources).toEqual([]);
  });

  it("reads comma-separated lists", () => {
    const query = parseArticleQuery(new URLSearchParams("categories=sports,health"));
    expect(query.categories).toEqual(["sports", "health"]);
  });

  it("reads repeated params", () => {
    const params = new URLSearchParams();
    params.append("sources", "guardian");
    params.append("sources", "nyt");

    expect(parseArticleQuery(params).sources).toEqual(["guardian", "nyt"]);
  });

  it("falls back to newest for an unknown sort", () => {
    expect(parseArticleQuery(new URLSearchParams("sort=sideways")).sort).toBe("newest");
    expect(parseArticleQuery(new URLSearchParams("sort=relevance")).sort).toBe("relevance");
  });

  it("drops unknown list values instead of rejecting the request", () => {
    // A stale bookmark naming a retired category should widen the results, not 400.
    const query = parseArticleQuery(new URLSearchParams("categories=sports,astrology"));
    expect(query.categories).toEqual(["sports"]);
  });

  it("coerces and clamps pagination", () => {
    expect(parseArticleQuery(new URLSearchParams("page=3&pageSize=20"))).toMatchObject({
      page: 3,
      pageSize: 20,
    });

    // Out-of-range values fall back to the defaults rather than throwing.
    expect(parseArticleQuery(new URLSearchParams("page=0&pageSize=500"))).toMatchObject({
      page: 1,
      pageSize: 12,
    });
  });

  it("rejects a malformed date", () => {
    expect(() => parseArticleQuery(new URLSearchParams("from=10-08-2026"))).toThrow();
  });

  it("trims the keyword", () => {
    expect(parseArticleQuery(new URLSearchParams("q=%20energy%20")).q).toBe("energy");
  });
});

describe("serializeArticleQuery", () => {
  it("omits defaults so shared urls stay short", () => {
    expect(serializeArticleQuery({ q: "", page: 1, pageSize: 12 }).toString()).toBe("");
  });

  it("round-trips through parse unchanged", () => {
    const original = parseArticleQuery(
      new URLSearchParams("q=energy&from=2026-08-01&to=2026-08-10&categories=science&page=2"),
    );

    expect(parseArticleQuery(serializeArticleQuery(original))).toEqual(original);
  });
});

describe("isEmptyQuery", () => {
  it("is true for an untouched query", () => {
    expect(isEmptyQuery(parseArticleQuery(new URLSearchParams()))).toBe(true);
  });

  it("is false once any filter is set", () => {
    expect(isEmptyQuery(parseArticleQuery(new URLSearchParams("q=fury")))).toBe(false);
    expect(isEmptyQuery(parseArticleQuery(new URLSearchParams("categories=sports")))).toBe(false);
  });
});
