# VOICE — Implementation Plan

**Frontend Take-Home Challenge — News Aggregator**

This document is the engineering plan for the challenge: what is being built, the stack and why,
how the architecture satisfies DRY / KISS / SOLID, how the design mockup maps to components, and
the ordered build steps with acceptance criteria for each.

---

## 1. The brief, restated

Build the user interface for a **news aggregator** that pulls articles from multiple sources and
presents them in a clean, readable format.

### Hard requirements

| # | Requirement | Where it is satisfied |
|---|---|---|
| R1 | **Article search and filtering** — search by keyword; filter by date, category and source | `/search` route + `FilterBar`, `useArticles` hook, `ArticleQuery` passed through to every provider |
| R2 | **Personalized news feed** — user selects preferred sources, categories and authors | `/feed` route + `PreferencesSheet`, persisted `usePreferences` store |
| R3 | **Mobile-responsive design** | Mobile-first Tailwind layers; nav collapses to a sheet; grid reflows at `md` / `lg` |
| G1 | React.js with **TypeScript** | Next.js 16 (React 19) with TypeScript in `strict` mode, no `any` |
| G2 | **At least three data sources** | NewsAPI, The Guardian, The New York Times — all three from the brief's list |
| G3 | **Dockerised** with clear run documentation | Multi-stage `Dockerfile` (standalone output), `docker-compose.yml`, README run section |
| G4 | **DRY, KISS, SOLID** | See §4 |

### Deliberate scope decisions

- **Next.js, not bare CRA/Vite.** The brief says "React.js with TypeScript". Next.js *is* React;
  it is chosen because API keys must never reach the browser. Route Handlers let the app proxy
  every provider server-side, which a pure client-side SPA cannot do without leaking keys. The
  output is still a front-end project — there is no database and no back-end domain logic.
- **No mock-only shortcut.** All three providers hit real APIs. An earlier draft added a local
  fixtures provider so the app would render without keys; it was removed in §10.4 because the brief
  says to choose sources *from its list*, and a fixtures file is not one of them. The app therefore
  needs at least one API key, which the README states plainly and the empty state explains
  in-product.

---

## 2. Stack

| Concern | Choice | Version | Rationale |
|---|---|---|---|
| Framework | Next.js App Router | 16.x | Server-side key custody, Route Handlers, streaming, image optimisation |
| UI runtime | React | 19.x | Required by the brief |
| Language | TypeScript | 5.9 (strict) | Required by the brief. TS 7 native compiler was evaluated; pinned to the version Next 16 supports out of the box to keep the reviewer's build reproducible |
| Styling | Tailwind CSS | 4.x | CSS-first `@theme` tokens, no config file, tiny output |
| Server state | TanStack Query | 5.x | Caching, dedupe, `keepPreviousData` for a non-flickering filter UX |
| Client state | Zustand + `persist` | 5.x | ~1 kB store for preferences, localStorage-backed |
| Validation | Zod | 4.x | One schema per provider response; parses untrusted API payloads at the boundary |
| Icons | Material Symbols (Google) | latest | Self-hosted npm package — no CDN call, works offline and inside Docker |
| Testing | Vitest + Testing Library | latest | Unit tests for mappers/aggregator, component tests for the filter UI |
| Lint/format | ESLint 9 flat config + Prettier | latest | |

### Typography

The mockup uses a tight, editorial grotesque for headlines and a neutral UI sans for chrome.

- **Display / headlines / wordmark** — `Archivo` (variable, Google Fonts). Matches the mockup's
  condensed-ish, high-contrast-in-weight news headline. Used at `-0.02em` tracking.
- **UI / body / meta** — `Inter` (variable, Google Fonts). Neutral, excellent at 12–14px where all
  the bylines and timestamps live.

Both are loaded through `next/font/google`, which self-hosts and inlines them at build time — no
runtime request to `fonts.googleapis.com`, so the container has no external font dependency.

### Icons

`material-symbols` npm package, `Rounded` set, weight 300. A single `<Icon name="search" />`
wrapper component keeps the ligature API in one place (DRY) and makes swapping the icon set a
one-file change.

---

## 3. Design system extracted from the mockup

Read off the reference screenshot and encoded as Tailwind v4 `@theme` tokens in
`src/app/globals.css`.

### Colour

| Token | Value | Use |
|---|---|---|
| `--color-ink` | `#0A0A0A` | Headlines, wordmark, active nav |
| `--color-ink-muted` | `#6B6B6B` | Body copy, inactive nav, category labels |
| `--color-ink-faint` | `#9A9A9A` | Timestamps, secondary metadata |
| `--color-surface` | `#FFFFFF` | Page and card background |
| `--color-surface-sunken` | `#F4F4F5` | Page surround, image placeholders |
| `--color-rule` | `#E6E6E6` | Hairline dividers between stories and nav underline track |
| `--color-accent` | `#0A0A0A` | Active indicator (the design is monochrome by intent) |

The design is deliberately achromatic — colour comes only from photography. A dark theme is
included as a token swap because the whole palette is variable-driven.

### Type scale

| Token | Size / line-height / weight | Use |
|---|---|---|
| `display` | 40px / 1.05 / 700 | Hero headline |
| `title-lg` | 20px / 1.25 / 700 | Sidebar story headlines |
| `title-md` | 24px / 1.2 / 700 | Section headings ("Trending authors") |
| `wordmark` | 20px / 1 / 700, `0.12em` tracking | VOICE |
| `body` | 13px / 1.5 / 400 | Article excerpt |
| `meta` | 12px / 1 / 500 | Byline, category, timestamp |
| `nav` | 13px / 1 / 500 | Category nav |

### Layout

- Page max width `1200px`, `24px` gutters, sitting on a sunken surround.
- Masthead row: `search` + `menu` (left) · wordmark (centre) · `x` + `facebook` + `account` (right).
  Implemented as a 3-column grid so the wordmark is optically centred regardless of side widths.
- Category nav: horizontally scrollable rail on mobile (`overflow-x-auto`, no scrollbar), evenly
  spaced on desktop. Active item = ink text + 2px ink underline.
- Content grid: `lg:grid-cols-[1.62fr_1fr]` with a `40px` gap — matches the ~62/38 split measured
  in the mockup. Single column below `lg`.
- Hero: 16:10 image, `12px` radius; meta row; display headline; excerpt; `read more` link.
- Sidebar: story rows of `[112px_1fr]`, hairline separator between rows, no separator after last.
- Trending authors: 2-up grid of author cards with a `north_east` arrow affordance.

### Responsive behaviour

| Breakpoint | Layout |
|---|---|
| `< 640px` | Single column; nav becomes a scroll rail; hamburger opens a full-height sheet with nav + preferences; sidebar stories stack under the hero; authors 1-up |
| `640–1024px` | Hero full width, sidebar stories become a 2-up card grid; authors 2-up |
| `≥ 1024px` | Two-column editorial layout as per the mockup |

---

## 4. Architecture

### Directory layout

```
src/
  app/
    layout.tsx                 # fonts, providers, shell
    page.tsx                   # Top News (the mockup screen)
    search/page.tsx            # R1 — search + filters
    feed/page.tsx              # R2 — personalised feed
    api/articles/route.ts      # aggregation endpoint
    api/sources/route.ts       # which providers are configured
  domain/
    article.ts                 # Article, Author, Category — the single shared model
    query.ts                   # ArticleQuery + Zod schema (keyword, from, to, category, sources, page)
    provider.ts                # NewsProvider interface
  providers/
    newsapi/{provider,mapper,schema}.ts
    guardian/{provider,mapper,schema}.ts
    nyt/{provider,mapper,schema}.ts
    registry.ts                # the only place that knows the concrete list
    aggregator.ts              # fan-out, settle, normalise, dedupe, sort
  components/
    layout/{Masthead,CategoryNav,MobileNav,Footer}.tsx
    article/{HeroArticle,StoryRow,StoryGrid,ArticleMeta,AuthorChip}.tsx
    filters/{SearchInput,FilterBar,DateRangeFilter,SourceFilter,CategoryFilter}.tsx
    preferences/{PreferencesSheet,PreferenceToggleGroup}.tsx
    ui/{Icon,Sheet,Select,Chip,Skeleton,EmptyState,ErrorState}.tsx
  hooks/{useArticles,useDebouncedValue,useQuerySync}.ts
  stores/preferences.ts
  lib/{http,dates,dedupe,env}.ts
```

### The provider abstraction — the core of the SOLID story

```ts
export interface NewsProvider {
  readonly id: SourceId;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;   // which filters it supports natively
  isConfigured(): boolean;                       // has its API key
  fetchArticles(query: ArticleQuery, signal: AbortSignal): Promise<Article[]>;
}
```

- **S — Single responsibility.** Each provider folder splits three jobs: `schema.ts` describes the
  wire format, `mapper.ts` converts wire → `Article`, `provider.ts` builds the request URL and
  orchestrates. A mapper never fetches; a provider never reshapes.
- **O — Open/closed.** Adding a fourth source means adding one folder and one line in
  `registry.ts`. The aggregator, hooks, routes and every component stay untouched.
- **L — Liskov.** Every provider is interchangeable behind `NewsProvider`. Providers that cannot
  filter natively (e.g. author filtering) declare it in `capabilities`; the aggregator then applies
  that filter in-memory, so callers get identical behaviour from any provider.
- **I — Interface segregation.** `NewsProvider` is deliberately small. Optional abilities live in
  the `capabilities` record rather than as methods every provider must stub out.
- **D — Dependency inversion.** `aggregator.ts` and the route handler depend on the `NewsProvider`
  interface and receive the provider list by injection — which is what makes the aggregator
  testable with fake providers and no network.

### DRY / KISS in practice

- One `Article` model. Every provider-specific shape dies at its mapper boundary; no component ever
  sees a NewsAPI or Guardian field name.
- One `ArticleQuery` type, one Zod schema, used by the client hook, the URL sync and the route
  handler — filters cannot drift between layers.
- One `<ArticleMeta>` renders the avatar/author/category/timestamp row used in the hero, the
  sidebar rows and the search results.
- No state library ceremony: server data in TanStack Query, user preferences in one small Zustand
  store, transient filter state in the URL. Nothing else is global.

### Data flow

```
UI (filters / preferences)
  → ArticleQuery (Zod-validated, mirrored into the URL)
    → GET /api/articles?…            [server only — API keys live here]
      → aggregator.fanOut(providers)
        → Promise.allSettled → per-provider mapper → Article[]
      → dedupe by normalised title+url → sort by publishedAt desc → paginate
    ← { articles, sources: { id, ok, error? }[] }
  ← TanStack Query cache → components
```

**Partial failure is a first-class case.** If Guardian is down and NewsAPI succeeds, the response is
still 200 with the NewsAPI articles plus a per-source status array; the UI shows a quiet inline
notice naming the failed source rather than blanking the page.

### Resilience and fallback

- Missing key → provider reports `isConfigured() === false` and is skipped, not errored.
- If **no** provider is configured, the app renders an empty state that names the missing keys and
  points at the README, rather than a blank page. (An earlier draft fell back to a local fixtures
  provider; removed in §10.4 as off-brief.)
- 10s timeout per provider via `AbortSignal.timeout`; failures are captured, never thrown upward.
- Route responses cached with `use cache` + `cacheLife('minutes')` to stay inside free-tier rate
  limits.

---

## 5. Build steps

Each step lists its acceptance criteria.

### Step 1 — Scaffold
`create-next-app` (TS, Tailwind v4, ESLint, App Router, src dir, Turbopack). Add Prettier, the
strict `tsconfig`, Archivo + Inter via `next/font/google`, `material-symbols`, and the `@theme`
token block from §3.
✅ `npm run dev` boots; tokens resolve; both fonts render.

### Step 2 — Domain layer
`Article`, `Author`, `Category`, `SourceId`, `ArticleQuery` + schemas. Pure types and Zod, zero
dependencies on React or Next.
✅ `tsc --noEmit` clean; query schema round-trips URL params.

### Step 3 — Providers
NewsAPI, Guardian and NYT adapters — schema, mapper, provider each. Fixtures provider. Registry +
aggregator with fan-out, dedupe, in-memory filter fill-in.
✅ Unit tests: each mapper turns a captured real payload into a valid `Article`; the aggregator
survives one failing provider and dedupes cross-source duplicates.

### Step 4 — API routes
`GET /api/articles` (validate → aggregate → respond, with per-source status) and `GET /api/sources`.
Env access confined to `lib/env.ts`.
✅ `curl` returns normalised articles; no key appears in any client bundle
(`grep` the `.next` client chunks).

### Step 5 — UI shell and Top News
Masthead, CategoryNav, MobileNav, HeroArticle, StoryRow, TrendingAuthors, Footer. Build against the
mockup at 1280px, then verify 375px and 768px.
✅ Side-by-side with the reference screenshot; no horizontal scroll at 320px; keyboard-navigable
nav with visible focus rings.

### Step 6 — Search and filtering (R1)
Debounced keyword input, date-range, category and multi-select source filters. State lives in the
URL (`useQuerySync`) so results are shareable and back/forward works. Loading skeletons, empty and
error states.
✅ Every filter narrows results; a copied URL reproduces the exact result set.

### Step 7 — Personalisation (R2)
`usePreferences` Zustand store (sources, categories, authors) with localStorage persistence and SSR
hydration guard. `PreferencesSheet` to edit them; `/feed` composes them into an `ArticleQuery`.
✅ Preferences survive reload; `/feed` reflects them; an empty-preferences state prompts setup.

### Step 8 — Accessibility and polish
Landmarks, skip link, `aria-current` on active nav, focus trap in the sheet, `prefers-reduced-motion`
respected, alt text from article titles, AA contrast on all text.
✅ Manual keyboard pass; no axe violations on the three routes.

### Step 9 — Docker
Multi-stage build (deps → build → runner) on `node:24-alpine` with `output: 'standalone'`, non-root
`nextjs` user, `docker-compose.yml` wiring `.env`, `.dockerignore`.
✅ `docker compose up --build` serves the app on :3000 from a clean clone; image is slim
(standalone, no dev deps).

### Step 10 — Verification
`npm run lint`, `npm run test`, `npm run build`, then drive the running app in Chrome at desktop and
mobile widths and compare against the mockup.
✅ All green; screenshots captured.

---

## 6. Environment variables

`.env.example` is committed; `.env.local` is git-ignored.

| Variable | Source | Where to get it | Required |
|---|---|---|---|
| `NEWSAPI_KEY` | NewsAPI.org | newsapi.org/register | No* |
| `GUARDIAN_KEY` | The Guardian | open-platform.theguardian.com/access | No* |
| `NYT_KEY` | New York Times | developer.nytimes.com | No* |

\* All optional individually. With none set the app serves fixture content. Note the NewsAPI free
"Developer" tier only authorises requests from `localhost`, which covers local and Docker-local use;
Guardian and NYT developer keys work anywhere.

All three are read **only** in `src/lib/env.ts`, which is imported exclusively by server modules —
no `NEXT_PUBLIC_` prefix anywhere, so keys cannot reach the browser bundle.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free-tier rate limits during review | Server-side response caching (`cacheLife('minutes')`) + client-side TanStack Query cache |
| A provider changes its payload shape | Zod parse at the boundary → that provider degrades to a captured error, others keep working |
| Reviewer has no API keys | Fixtures provider fallback; app fully functional and demonstrates every feature |
| NewsAPI localhost-only restriction | Documented in README; Guardian + NYT still satisfy the ≥3-source rule in any environment |
| Layout drift from the mockup | Tokens derived from measurement, then a browser-based side-by-side QA pass in Step 10 |

---

## 8. Definition of done

- [x] R1, R2, R3 demonstrably working
- [x] Three real providers behind one interface, plus fallback
- [x] `lint`, `test`, `build` all pass; `tsc` strict, no `any`
- [x] `docker compose up --build` works from a clean clone
- [x] README documents setup, env vars, Docker, architecture and trade-offs
- [x] UI matches the mockup at desktop and degrades cleanly to 320px

---

## 9. Verification record

What was actually checked, and how.

| Check | Method | Result |
|---|---|---|
| Types | `tsc --noEmit`, strict + `noUncheckedIndexedAccess` | Clean, no `any` |
| Lint | `eslint` (flat config, React 19 rules) | Clean |
| Tests | `vitest run` | 72 passing across 7 suites |
| Production build | `next build` | 6 routes, no warnings |
| **Key leakage** | Built with canary key values, then `grep -r CANARY_ .next/static` and `.next/server` | **No match in either** — keys are runtime-read only |
| Provider URLs | Ran with deliberately invalid keys against the live APIs | All three returned `401`, surfaced as "API key was rejected" per source — the request shapes are correct |
| Partial failure UI | Same run, in the browser | Inline notice names the unavailable sources; page does not blank |
| Docker image | `docker build` → `docker run` | Healthy, serves `200` on every route as non-root uid 1001 |
| Docker rendering | Screenshot of the running container | Fonts, Material Symbols and images all render from the container |
| Responsive | Site loaded in 390px and 768px iframes | Single column, nav becomes a scroll rail, no horizontal overflow |
| Design fidelity | Side-by-side against the supplied mockup at 1440px | Matches |

---

## 10. Revision: source filtering and UX rebuild

Two problems were reported against the first version, and both were real.

### 10.1 "Source" meant the wrong thing

The filter was keyed on **provider** (NewsAPI / Guardian / NYT), not **publication**. That is a
misreading of the requirement: NewsAPI alone spans tens of thousands of publications, so "filter
the results by source" cannot mean "filter by which API we called". With only the three providers
as options, the filter was also nearly useless in practice.

The domain model now separates the two:

| Concept | Field | Meaning | Where it appears |
|---|---|---|---|
| Publication | `publications` | BBC News, Reuters, TechCrunch | The primary "Source" filter |
| Provider | `providers` | Which upstream API served it | A secondary "Data feed" filter |

Supporting changes:

- `ArticlesResponse` now carries **facets**: publications, categories and authors, each with a
  match count. Counts are what turn a filter from a guess into a decision.
- Facets are computed **before** the publication filter is applied. Building them after would
  collapse the source list to the one value already chosen, with no way back. There is a test
  asserting exactly this.
- Added `sort` (newest / oldest / relevance), with relevance disabled when there is no keyword.

On live data this now yields **26 publications** across the three sources, so the filter does real
work.

### 10.2 The UX was weak

Audit findings and what was done:

| Problem | Fix |
|---|---|
| Date and source hidden behind a "Filters" disclosure | Persistent faceted rail on desktop; the identical panel in a sheet below `lg` |
| No way to see what was applied | `ActiveFilters`: a removable chip per filter, plus "Clear all" |
| No counts on any filter value | Every facet row carries its match count |
| No sort control | `SortSelect`, three options, native `<select>` |
| Nav had Home / New / Top News doing one job | Collapsed to "Top News" and "Latest", which order results differently |
| Long source lists unusable | Filter-within box plus a show-more cut |
| Preferences were one undifferentiated chip wall | Grouped into Categories / Sources / Authors, each with a one-line explanation, options drawn from the live feed |

### 10.3 Category classification rebuilt

The category facet was dominated by a "General" bucket holding 35% of articles. Inspecting what the
live APIs actually return showed why: sections like `US news`, `World news`, `UK news` and `New
York` had nowhere to go.

- Added a **World** category, and an exact `SECTION_MAP` lookup for the section names the APIs
  really emit. A publisher-declared section is now looked up, not guessed at.
- Split the resolver's input into `sections`, `publication` and `text`, because they are different
  kinds of evidence. A section named "World" means world news; the word "world" in "Marathon world
  record" does not. Sharing one keyword table between them was the bug.
- Added a publication hint for single-subject outlets (ESPN, TechCrunch, CNBC), which is the only
  signal available for NewsAPI articles beyond the headline.

General fell from 28/80 to 21/80, and Technology tripled.

### 10.4 Scope correction

The brief says to choose at least three sources **from its list**. An earlier draft also shipped a
local `fixtures` provider so the app would run without API keys. It was not a data source and not
on the list, so it has been removed. The application now has exactly three providers, all from the
brief. The cost is that the app needs at least one API key to show anything, which the README now
states plainly and the empty state explains in-product.

### Bugs found by this process

Recorded because they are the useful part of the record:

1. **`"ai"` matched inside `"waiting"`.** A story headlined "Hospital waiting lists fall" was
   classified as *technology*. Naive substring matching in the category resolver. Fixed with
   word-boundary matching; `"art"` inside `"article"` was the same bug.
2. **First-match-wins misclassified overlapping stories.** "Central bank holds rates steady" hit
   both `bank` (economy) and `policy` (politics), and politics won purely because it was declared
   first. Replaced with weighted scoring, hints ordered by authority.
3. **`useSearchParams` in the root-layout nav broke the static prerender** of `/404`. Split the
   rail so only the active-item lookup sits behind a Suspense boundary.
4. **`setState` inside an effect** in the preferences hydration guard. Replaced with
   `useSyncExternalStore` against Zustand's own rehydration signal.
5. **A cold image-optimiser cache showed placeholders** for images that were fine. Added a single
   retry before treating a thumbnail as broken.
6. **Copy bug:** the failure notice read "A and B and C" and promised "showing everything else"
   even when nothing had loaded.
7. **A selected facet vanished when its count hit zero.** `FacetGroup` short-circuited to its empty
   hint on `facets.length === 0`, which also hid any active selection, stranding the reader with a
   filter they could no longer see or switch off. Caught by a component test written for exactly
   that case.
8. **`"world"` in a headline was read as world news**, filing "Marathon world record falls" under
   World. Fixed by separating section evidence from prose evidence, as described in 10.3.


---

## 11. Design system pass

An audit of the front end found four classes of drift and one accessibility
failure. All were fixed by moving decisions into tokens and primitives rather
than by restyling components individually.

### What the audit found

| Finding | Evidence | Fix |
|---|---|---|
| **`ink-faint` failed WCAG AA** | 2.81:1 on white, used for timestamps, counts and captions, which is real text | Darkened to `#757575` (4.61:1); dark mode `#8a8a8a` (5.66:1) |
| Seven ad-hoc display sizes | `text-[1.875rem]`, `text-[2.25rem]`, `text-[2.625rem]`, `text-[2.375rem]`… | Named tokens: `display-sm/md/lg`, `lead`, `wordmark` |
| Buttons re-typed in twelve files | Four different padding combinations, so no two controls matched height | One `Button` primitive with `solid`/`outline`/`ghost` variants |
| Four section-heading treatments | Bands had a 2px rule, Trending authors none, page titles plain | One `SectionHeading` / `Section` primitive |
| Fourteen `mt-*` values | Six of them inside a 4–14px band | Five semantic steps: `tight`, `element`, `stack`, `section`, `band` |
| Chip written three times | Date presets, preference chips, active filters | One `Chip` / `RemovableChip` / `CountBadge` |

### Two layout bugs the pass exposed

**`tailwind-merge` was silently deleting the accent colour.** `cn("text-accent … text-kicker")` looks fine, but twMerge classifies both as `text-*` utilities and keeps only the last. It has no way to know `text-kicker` is a size from our own `--text-*` token rather than a colour. Category kickers were rendering in ink, not accent. Kicker typography now lives in a single `.kicker` CSS class, which sidesteps the collision entirely.

**Kickers were overlapping the badge beside them.** As a flex item in the narrow sidebar column the kicker was laid out at 24px while its text needed 58px, so CULTURE drew straight across the REVIEW pill. `flex-shrink: 0` did not prevent it; `width: max-content` did.

> **Corrected in §12.** `width: max-content` treated a symptom. The real cause was a theme-token name collision, found only when the identical 24px signature reappeared on the section rail. Both patches have been removed.

**The nav no longer fit on one line.** Eleven sections at the increased 14px nav size needed ~1210px against a 1200px container, clipping Health. The rail is now allowed to run wider than the text column, which is standard on news front pages and keeps every label readable rather than abbreviating them.

### Contrast, measured

| Token | Light on surface | Dark on surface |
|---|---|---|
| `ink` | 20.1:1 | — |
| `ink-muted` | 5.33:1 | 7.57:1 |
| `ink-faint` | 4.61:1 | 5.66:1 |
| `accent` | 6.43:1 | 6.88:1 |

Every text token clears AA in both themes.

## 12. Revision: navigation, reader and filter redesign

Four surfaces were reworked in this round — the section rail, the mobile menu,
the reader page and the search filter rail — and the work uncovered one root
cause behind a bug that had been patched twice without being understood.

### 12.1 The 24px bug: a theme token that collided with a utility

Every `inline-block` element in the app was pinned to exactly 24px with its text
overflowing. It had been patched once on the category kicker (`width:
max-content`) and reappeared identically on the nav rail, where all eleven
section labels stacked on top of one another.

Nothing in the source set a width. Isolating the element showed the difference
that mattered:

```
<a style="display:inline-block">Top News</a>   → 76px   ✔
<a class="inline-block">Top News</a>           → 24px   ✘
```

Same computed `display`, different width — so the *class* carried more than the
display declaration. The generated stylesheet had two rules for it:

```css
.inline-block { display: inline-block }               /* the display utility  */
.inline-block { inline-size: var(--spacing-block) }   /* wins: equal specificity, later */
```

Tailwind v4 derives utilities from theme tokens, and the spacing scale feeds
`inline-*` (the logical-property form of `width`) as well as `mt-*` and `p-*`.
Naming a spacing step `block` therefore generated `inline-block` as a **width**
utility, at 1.5rem — 24px — which overrode the display utility of the same name.

**Fix:** renamed the token `--spacing-block` → `--spacing-stack` (and the 21
`mt-block`/`mb-block`/`space-y-block` usages with it). Both `width: max-content`
patches were then removed, since they were compensating for this.

The general rule, recorded in `globals.css`: a theme token must not be named
after a Tailwind keyword — `block`, `auto`, `full`, `fit`, `min`, `max` — because
the generated utility can collide with a built-in of the same name. The failure
is silent and presents as a layout bug with no width anywhere in the source.

A related root-cause fix landed alongside it: `tailwind-merge` was configured
with the VOICE type scale via `extendTailwindMerge`, so custom `--text-*` sizes
are no longer misfiled as colours and dropped. That retires the `.kicker`
workaround from §11 as well.

### 12.2 A provider request that had drifted from its mapper

The reader page showed no topics and no photo credit. The Guardian returns only
the fields you ask for, and `fetchArticle` was requesting a **narrower** set than
`fetchArticles` — `show-tags=contributor` only, and no `show-elements` at all —
so the mapper was faithfully mapping data that had never been requested. No
error, no warning; just missing content.

Both call sites now share one `SHOW_FIELDS`/`SHOW_TAGS`/`SHOW_ELEMENTS`
declaration, the reader adding only `body`. `provider.test.ts` asserts on the
built URL that the reader request is a superset of the search request, which is
the only place this class of drift is visible. Topics, captions and credits now
render.

### 12.3 Interface changes

| Surface | Problem | Change |
|---|---|---|
| **Section rail** | `justify-between` made spacing a function of section count; views and categories were indistinguishable; labels sliced at the scroll edge read as breakage | Centred on a fixed gap; divider between orderings (Top News, Latest) and sections; edge fade while scrollable; active item scrolled into view on mobile |
| **Mobile menu** | Duplicated the rail verbatim, so it added no reach | Search and My Feed promoted to labelled actions; sections in a two-column grid with the current one marked |
| **Reader page** | Bare metadata row; publisher link buried in a grey box; no sense of length on 3,000-word bodies | Byline block (avatar, author link, publication · date · reading time); reading-progress bar; topics as linked chips; publisher link promoted to an end-of-article card |
| **Filter rail** | Collapsed groups showed a count but not *which* filters were set; all four groups looked equally important | Each collapsed group names its selections; per-group icons; Source and Category open by default |

### 12.4 A render-phase router update

Typing in the search field logged *"Cannot update a component (`LinkComponent`)
while rendering a different component (`SearchField`)"*.

`SearchField` derives state during render, which is React's documented pattern
and correct for the parent → child direction (mirroring `value` into `draft`
without an effect avoids a stale frame). The child → parent push had been
written the same way — but that rule only permits adjusting a component's **own**
state. `onChange` here is `setQuery`, which calls `router.replace`, so the render
pass was updating the router mid-render.

The upward push moved into an effect, with `onChange` held in a ref so the
effect depends only on the debounced value and an inline prop cannot re-fire it
on every parent render. The `lastPushed` guard became a ref for the same reason.
Debounced typing, the URL sync, the mirror and the back button were all
re-checked afterwards.

### 12.5 Verification

- `npm run verify` — 181 tests across 14 files, lint, typecheck and production build all pass
- Docker image builds; container serves `/`, `/search`, `/feed` and `/api/articles` at 200 as non-root uid 1001
- Production CSS confirmed to emit a single `.inline-block{display:inline-block}`
- Rail, reader, filter rail and mobile menu confirmed visually at desktop and mobile widths

## 13. Review pass: correctness audit

A read-through of the whole data layer against the brief, looking for defects
rather than polish. Three things came out of it.

### 13.1 Choosing a source erased the other sources

The route narrowed the *fetch* to the selected providers
(`resolveProviders(query.sources)`), so the response could only ever describe
those. Picking "The Guardian" left a Source filter containing nothing but The
Guardian — no way to switch source or add a second one without Clear all.

The module had already solved this for authors: filter *after* the facets are
built, never before. Sources now follow the same rule. Every configured provider
is queried on each request and the source filter is applied in `aggregate`
alongside the author filter, so the panel keeps showing all three with live
counts while the results narrow as asked.

The cost is that a reader who has narrowed to one source still causes three
upstream calls. That is the price of the counts beside the other two, the
responses are cached for five minutes, and it is what the unfiltered case
already did.

### 13.2 Source counts overstated the result set

Counts came from each provider's raw return, before dedupe. On one query the
three sources advertised 37 + 40 + 10 = 87 against a stated total of 83: the
four cross-source duplicates were counted twice, so clicking a source could
deliver fewer stories than its badge promised. Counts are now taken from the
deduped set and sum exactly to the total.

### 13.3 A second `cn` helper

`src/lib/cn.ts` duplicated `src/lib/utils.ts` with an **unconfigured**
`twMerge` — the exact landmine that caused the type-scale bug in §12.1. Nothing
imported it; it was deleted rather than left for someone to import later.

### Not defects

Two things that looked wrong under the browser tools but were not: article
thumbnails rendering as grey boxes (a screenshot-capture artifact — sampling the
canvas returned full-colour photographs), and the search page appearing stuck on
"Searching…" (a cold Turbopack compile plus a 2.5 s upstream call; it resolves in
around nine seconds and the probes were simply too impatient).
