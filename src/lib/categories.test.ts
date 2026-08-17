import { describe, expect, it } from "vitest";
import { resolveCategory } from "./categories";

describe("resolveCategory", () => {
  describe("sections are looked up, not guessed", () => {
    /**
     * These are the exact section names the two live APIs returned on a sample
     * of recent articles. Before the "world" category and this lookup existed,
     * most of them fell into the general fallback, which made General by far
     * the largest facet and the category filter close to useless.
     */
    it.each([
      ["US news", "world"],
      ["World news", "world"],
      ["UK news", "world"],
      ["New York", "world"],
      ["U.S.", "world"],
      ["Metro", "world"],
      ["Foreign", "world"],
      ["Football", "sports"],
      ["Sport", "sports"],
      ["Environment", "science"],
      ["Music", "culture"],
      ["Stage", "culture"],
      ["Food", "culture"],
      ["Politics", "politics"],
      ["Business Day", "economy"],
      ["Society", "health"],
      ["Arts", "culture"],
      ["Technology", "technology"],
    ])("maps the %s section to %s", (section, expected) => {
      expect(resolveCategory({ sections: [section] })).toBe(expected);
    });

    it("is case and whitespace insensitive", () => {
      expect(resolveCategory({ sections: ["  business day  "] })).toBe("economy");
    });

    it("lets the section beat a conflicting keyword in the headline", () => {
      expect(
        resolveCategory({ sections: ["Sport"], text: ["Transfer market heats up"] }),
      ).toBe("sports");
    });

    it("falls through to the next section when the first is unknown", () => {
      expect(resolveCategory({ sections: ["Weekend supplement", "Football"] })).toBe("sports");
    });
  });

  describe("single-subject publications", () => {
    it("classifies by outlet when there is no section", () => {
      expect(resolveCategory({ publication: "ESPN", text: ["A quiet night in Miami"] })).toBe(
        "sports",
      );
      expect(resolveCategory({ publication: "TechCrunch", text: ["Series B closes"] })).toBe(
        "technology",
      );
      expect(resolveCategory({ publication: "CNBC", text: ["A quiet session"] })).toBe("economy");
    });

    it("ignores general-interest outlets, which cover everything", () => {
      // The BBC publishes in every section, so its name says nothing about any
      // one article. This must fall through to the headline.
      expect(
        resolveCategory({ publication: "BBC News", text: ["Marathon record falls in Berlin"] }),
      ).toBe("sports");
    });

    it("still lets a declared section win over the outlet", () => {
      expect(resolveCategory({ sections: ["Business Day"], publication: "ESPN" })).toBe("economy");
    });
  });

  describe("prose is the weakest signal", () => {
    it("infers from a headline when no section is supplied", () => {
      expect(resolveCategory({ text: ["Marathon world record falls in Berlin"] })).toBe("sports");
      expect(resolveCategory({ text: ["Economic outlook downgraded"] })).toBe("economy");
      expect(resolveCategory({ text: ["Astronomers find a new exoplanet"] })).toBe("science");
    });

    /**
     * The whole reason sections and prose are separate arguments. "World" is a
     * real section name but means nothing in a sentence, so it takes no part in
     * headline scoring. Both of these were misfiled when one keyword table
     * served both kinds of hint.
     */
    it("does not read 'world' in a headline as world news", () => {
      expect(resolveCategory({ text: ["Marathon world record falls in Berlin"] })).toBe("sports");
      expect(resolveCategory({ text: ["Astronomers find a new world"] })).toBe("science");
    });

    it("prefers the stronger signal when two categories both match", () => {
      expect(
        resolveCategory({ text: ["Central bank holds rates steady", "Policymakers signalled cuts"] }),
      ).toBe("economy");
    });
  });

  describe("word-boundary matching", () => {
    // Both of these were real misclassifications under naive substring matching.
    it("does not let 'ai' inside 'waiting' mean technology", () => {
      expect(resolveCategory({ sections: ["Society"], text: ["Hospital waiting lists fall"] })).toBe(
        "health",
      );
    });

    it("does not let 'art' inside 'article' mean culture", () => {
      expect(resolveCategory({ text: ["The article argues for higher tariffs"] })).toBe("economy");
    });
  });

  describe("fallback", () => {
    it("returns general when nothing matches", () => {
      expect(resolveCategory({ sections: ["Opinion"], text: ["A view from the newsroom"] })).toBe(
        "general",
      );
      expect(resolveCategory({})).toBe("general");
      expect(resolveCategory({ sections: [null], text: [undefined, ""] })).toBe("general");
    });
  });
});
