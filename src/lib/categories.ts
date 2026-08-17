import { CATEGORIES, type Category } from "@/domain/article";

/**
 * Maps arbitrary provider taxonomies onto our canonical categories.
 *
 * A section name and a headline are not the same kind of evidence, so they are
 * passed separately: a section is the publisher's own assertion, a headline is
 * prose. "Astronomers find a new world" is not world news. Sections get an exact
 * lookup first, and section-only words never take part in headline scoring.
 */

/** Exact section names from the live APIs, checked before any keyword scoring. */
const SECTION_MAP: Record<string, Category> = {
  // World and national desks
  world: "world",
  "world news": "world",
  "us news": "world",
  "u.s.": "world",
  "uk news": "world",
  "australia news": "world",
  "new york": "world",
  metro: "world",
  foreign: "world",
  national: "world",
  international: "world",
  "global development": "world",

  // Politics
  politics: "politics",
  "us politics": "politics",
  washington: "politics",
  express: "politics",

  // Sport
  sport: "sports",
  sports: "sports",
  football: "sports",
  soccer: "sports",
  cricket: "sports",
  rugby: "sports",
  tennis: "sports",
  golf: "sports",
  boxing: "sports",

  // Economy and business
  business: "economy",
  "business day": "economy",
  money: "economy",
  economy: "economy",
  markets: "economy",
  dealbook: "economy",
  "your money": "economy",

  // Culture
  culture: "culture",
  arts: "culture",
  art: "culture",
  "art and design": "culture",
  music: "culture",
  film: "culture",
  movies: "culture",
  books: "culture",
  stage: "culture",
  theater: "culture",
  theatre: "culture",
  television: "culture",
  "tv and radio": "culture",
  fashion: "culture",
  style: "culture",
  "life and style": "culture",
  food: "culture",
  cooking: "culture",
  travel: "culture",
  games: "culture",

  // Technology
  technology: "technology",
  tech: "technology",

  // Science and environment
  science: "science",
  environment: "science",
  climate: "science",
  space: "science",

  // Health
  health: "health",
  society: "health",
  well: "health",
  wellness: "health",
};

/**
 * Keyword fallbacks, used when there is no section or the section is unknown.
 *
 * Deliberately excludes words that only carry meaning as a section label
 * ("world", "national", "style", "well"). Those appear in `SECTION_MAP` only,
 * so they can never misfile an article on the strength of a headline.
 */
const KEYWORDS: Record<Category, readonly string[]> = {
  world: ["geopolitic", "diplomatic", "united nations", "refugee", "border crisis"],
  politics: [
    "politic",
    "election",
    "government",
    "parliament",
    "congress",
    "senate",
    "president",
    "policy",
    "diplomat",
    "campaign",
    "coalition",
  ],
  sports: [
    "sport",
    "football",
    "soccer",
    "basketball",
    "tennis",
    "cricket",
    "boxing",
    "olympic",
    "athletic",
    "marathon",
    "rugby",
    "formula 1",
    "golf",
    "nfl",
    "nba",
  ],
  economy: [
    "econom",
    "business",
    "market",
    "finance",
    "financial",
    "money",
    "trade",
    "stock",
    "inflation",
    "bank",
    "budget",
    "tariff",
  ],
  culture: [
    "culture",
    "cultural",
    "arts",
    "artist",
    "music",
    "film",
    "movie",
    "book",
    "theat",
    "fashion",
    "entertainment",
    "television",
    "museum",
    "recipe",
    "restaurant",
  ],
  technology: [
    "tech",
    "software",
    "hardware",
    "computing",
    "internet",
    "artificial intelligence",
    "machine learning",
    "gadget",
    "startup",
    "cyber",
    "semiconductor",
    "chipmaker",
  ],
  science: [
    "science",
    "scientific",
    "scientist",
    "physics",
    "climate",
    "environment",
    "astronom",
    "biolog",
    "research",
    "exoplanet",
  ],
  health: [
    "health",
    "medic",
    "medicine",
    "disease",
    "vaccine",
    "hospital",
    "nutrition",
    "patient",
    "nhs",
  ],
  general: [],
};

/**
 * Specialist outlets, used as a weak hint of last resort.
 *
 * NewsAPI's `/everything` endpoint returns no section, so roughly a third of
 * its articles have nothing but a headline to go on. But an ESPN story is
 * almost certainly sport and a TechCrunch story is almost certainly technology,
 * and that is worth using. Only single-subject outlets belong here: general
 * newspapers such as the BBC or CNN cover everything, so their name says
 * nothing about any individual article.
 */
const PUBLICATION_MAP: Record<string, Category> = {
  espn: "sports",
  "sky sports": "sports",
  "bbc sport": "sports",
  "mma fighting": "sports",
  "the athletic": "sports",
  "fox sports": "sports",
  goal: "sports",

  techcrunch: "technology",
  "the verge": "technology",
  wired: "technology",
  engadget: "technology",
  "ars technica": "technology",
  phoronix: "technology",
  "9to5google.com": "technology",
  "9to5mac.com": "technology",
  gizmodo: "technology",
  slashdot: "technology",

  cnbc: "economy",
  forbes: "economy",
  bloomberg: "economy",
  "financial times": "economy",
  "business insider": "economy",
  marketwatch: "economy",

  "hollywood reporter": "culture",
  variety: "culture",
  pitchfork: "culture",
  billboard: "culture",
  "yahoo entertainment": "culture",
  "rolling stone": "culture",

  "scientific american": "science",
  "new scientist": "science",
  "national geographic": "science",
  space: "science",

  webmd: "health",
  healthline: "health",
  statnews: "health",
};

/** Compiled once per keyword: this runs for every article mapped. */
const patterns = new Map<string, RegExp>();

function pattern(keyword: string): RegExp {
  let compiled = patterns.get(keyword);
  if (!compiled) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Long keywords are stems, open-ended on the right, so "econom" catches
    // "economy" and "economic". Short ones must match a whole word: otherwise
    // "art" matches "article" and "ai" matches "waiting", both of which
    // misfiled real articles before this rule existed.
    compiled =
      keyword.length <= 4 ? new RegExp(`\\b${escaped}\\b`, "i") : new RegExp(`\\b${escaped}`, "i");

    patterns.set(keyword, compiled);
  }
  return compiled;
}

export interface CategoryHints {
  /** Publisher-declared sections, most authoritative first. */
  sections?: (string | null | undefined)[];
  /** The originating outlet, used only when it is a single-subject publication. */
  publication?: string | null;
  /** Free prose: headline, standfirst, description. */
  text?: (string | null | undefined)[];
}

export function resolveCategory({
  sections = [],
  publication,
  text = [],
}: CategoryHints): Category {
  // 1. An exact section lookup wins outright. The publisher already told us.
  for (const section of sections) {
    const key = section?.trim().toLowerCase();
    if (!key) continue;

    const mapped = SECTION_MAP[key];
    if (mapped) return mapped;
  }

  // 2. A single-subject outlet is the next best thing to a declared section.
  const outlet = publication?.trim().toLowerCase();
  if (outlet) {
    const mapped = PUBLICATION_MAP[outlet];
    if (mapped) return mapped;
  }

  // 3. Unknown section names still get keyword-scored, at high weight.
  const scores = new Map<Category, number>();
  for (const section of sections) {
    if (section) score(scores, section, 4);
  }

  // 4. Prose is the weakest signal. Within it, the first hint (the headline)
  // still counts for more than the ones after it (standfirst, description): a
  // story headlined "Central bank holds rates steady" is economics even if the
  // body mentions policymakers.
  text.forEach((hint, index) => {
    if (hint) score(scores, hint, index === 0 ? 2 : 1);
  });

  let best: Category = "general";
  let bestScore = 0;

  // Iterating CATEGORIES rather than the map keeps ties resolved in a fixed,
  // declared order instead of insertion order.
  for (const category of CATEGORIES) {
    const value = scores.get(category) ?? 0;
    if (value > bestScore) {
      best = category;
      bestScore = value;
    }
  }

  return best;
}

function score(scores: Map<Category, number>, hint: string, weight: number): void {
  for (const category of CATEGORIES) {
    if (category === "general") continue;

    let points = 0;
    for (const keyword of KEYWORDS[category]) {
      if (pattern(keyword).test(hint)) points += 1;
    }

    if (points > 0) scores.set(category, (scores.get(category) ?? 0) + points * weight);
  }
}

/** Category → the search term to push upstream when a provider supports it. */
export const CATEGORY_QUERY_TERMS: Record<Category, string> = {
  general: "news",
  world: "world news",
  politics: "politics",
  sports: "sport",
  economy: "business economy",
  culture: "culture arts",
  technology: "technology",
  science: "science",
  health: "health",
};
