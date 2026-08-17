# VOICE

A news aggregator that pulls articles from **NewsAPI**, **The Guardian** and **The New York
Times**, normalises them into one model, and presents them in a clean, searchable, personalisable
front page.

Built for the Frontend take-home challenge. Next.js 16 (React 19) · TypeScript strict ·
Tailwind CSS v4 · shadcn/ui (Radix) · TanStack Query · Zustand · Zod · Vitest · Docker.

**Live demo → <https://voice-lilac-seven.vercel.app>**

Running against real API keys held server-side, with all three sources live. Nothing to install and
no keys to obtain; to run it yourself, see [Quick start](#quick-start) below.

---

## Quick start

### With Docker (no Node.js needed)

```bash
git clone https://github.com/Fuglydami/voice.git && cd voice
cp .env.example .env          # optional — see "API keys" below
docker compose up --build
```

Open <http://localhost:3000>.

> **You need at least one API key.** All three are free and take about a minute each; see
> [API keys](#api-keys) below. A provider whose key is missing is skipped rather than failed, so the
> app works fine with one or two configured, but with none it has nothing to show.

To stop it: `docker compose down`.

### Without Docker

```bash
npm install
cp .env.example .env.local    # optional
npm run dev
```

Open <http://localhost:3000>.

### Docker without compose

```bash
docker build -t voice .
docker run --rm -p 3000:3000 --env-file .env voice
```

---

## API keys

All three are optional and free.

| Variable | Provider | Where to get it |
|---|---|---|
| `NEWSAPI_KEY` | NewsAPI.org | <https://newsapi.org/register> |
| `GUARDIAN_KEY` | The Guardian Open Platform | <https://open-platform.theguardian.com/access> |
| `NYT_KEY` | New York Times Article Search | <https://developer.nytimes.com> |

Put them in `.env` (Docker) or `.env.local` (local dev). Restart to pick them up. Visit
`/api/sources` to confirm what the server sees.

**One caveat worth knowing:** NewsAPI's free *Developer* plan restricts **browser** requests to a
`localhost` origin. That restriction is a CORS rule, and it does not apply here: this app calls
NewsAPI from its own server, so there is no `Origin` header and nothing to reject. All three
sources work locally and on the deployed demo alike. The plan is still labelled development-use by
NewsAPI, so treat the free key as fine for a demo and not for production traffic.

Keys are read in exactly one module — `src/lib/env.ts`, marked `server-only` — and none uses the
`NEXT_PUBLIC_` prefix, so a key cannot reach the browser bundle. The browser never talks to a news
provider directly; it talks to this app's own `/api/articles`.

---

## What it does

### Article search and filtering

`/search` searches all three sources at once and filters by:

- **source**: NewsAPI, The Guardian, The New York Times
- **category**, nine canonical sections mapped from each source's own taxonomy
- **date range**, with Today / Last 7 days / Last 30 days shortcuts
- **author**
- **keyword**, debounced, matched against headline, excerpt, author and publication

Every filter is a faceted list with **match counts**, so you can see which values are worth
clicking before you click them, and a removable chip summary sits above the results so you can
always see and undo any single choice.

Source counts come from the per-source status rather than from the filtered results, so picking one
source does not zero out the other two and strand you with a filter you cannot widen. There is a
test for that.

Results are a scannable list rather than a card grid: search is read against a query, so three
times as many headlines above the fold and a single column for the eye to travel beat big images.

All filter state lives in the **URL**, so a result set is shareable, the back button steps through
previous filter combinations, and a reload does not lose your place. Results can be sorted by
newest, oldest or relevance (relevance is disabled without a keyword, since relevance to nothing is
not an order).

### Personalised news feed

`/feed` builds a feed from your chosen categories, sources and authors. The options offered are
drawn from what is actually in the feed right now, with counts, so every choice on screen will
return something. Choices persist in `localStorage`, survive a reload, and compose into the *same*
`ArticleQuery` the search page uses: personalisation is the general query with your choices
pre-filled, not a separate data path with its own filtering rules.

An unconfigured feed opens straight into the picker rather than showing an empty page with a button
that opens it.

### In-app reader

Headlines open `/article/[source]/[ref]` rather than bouncing straight to the publisher. The page
re-fetches that one article from its source and renders as much of it as the API will give, with the
publisher credited and linked either way. See the trade-offs section for exactly how much text each
source returns.

The Guardian is the only one of the three with a fetch-by-id endpoint, so `NewsProvider` gained an
**optional** `fetchArticle` method rather than one every source has to stub. That is the same
interface-segregation reasoning the `capabilities` record already follows.

### Loading states

Every route that waits on the network says so. `/search` and `/feed` render skeletons shaped like
their real content; the front page is a Server Component, so it uses a route-level `loading.tsx`
that Next.js streams immediately while the three API calls resolve. Filter changes dim the current
results rather than collapsing to a skeleton, so the page never jumps while you narrow a search.

### Mobile-responsive

Mobile-first throughout. Below `lg` the two-column editorial layout collapses to one and the filter
rail moves into a sheet that carries **every** filter the desktop sidebar has. The section rail
becomes a horizontal scroll rail rather than wrapping or hiding, and the hamburger opens a
native-`<dialog>` sheet with the full navigation. No horizontal page scroll at 320px.

---

## Architecture

```
src/
  domain/        Article, ArticleQuery, NewsProvider — types and schemas only
  providers/     One folder per source (schema + mapper + provider) + registry + aggregator
  app/api/       Route handlers — the only place API keys are used
  app/           Routes: / (Top News), /search, /feed, /article/[source]/[ref] (reader)
  components/    layout · article · filters · preferences · ui
  hooks/         useArticles, useQuerySync, useDebouncedValue
  stores/        Persisted reader preferences
  lib/           env, http, dates, text, categories, trending, cn
```

### Data flow

```
UI (filters / preferences)
  → ArticleQuery (Zod-validated, mirrored into the URL)
    → GET /api/articles                  ← API keys live here, server-side only
      → aggregator.fanOut(providers)     ← Promise.allSettled
        → per-provider mapper → Article[]
      → residual filters → dedupe → sort → paginate
    ← { articles, sources: [{ id, ok, error? }] }
  ← TanStack Query cache → components
```

The Top News page is a Server Component and calls the aggregator **directly** rather than fetching
its own endpoint — the server making an HTTP round trip to itself for data it can already reach
would cost an extra request per page view for nothing. The route handler exists for the two
client-driven pages, which genuinely need it.

### Partial failure is a first-class case

If the Guardian is down and NewsAPI answers, the response is still `200` with the articles that
arrived plus a per-source status array. The UI shows a quiet inline notice naming the unavailable
source instead of blanking the page. A missing API key is *skipped*, not failed.

### How this satisfies DRY, KISS and SOLID

**Single responsibility** — each provider folder splits three jobs: `schema.ts` describes the wire
format, `mapper.ts` converts wire → `Article`, `provider.ts` builds the request. A mapper never
fetches; a provider never reshapes. This is also what makes the mappers testable against captured
payloads with no network.

**Open/closed** — adding a fourth source is one new folder and one line in `providers/registry.ts`.
The aggregator, the routes, the hooks and every component stay untouched.

**Liskov substitution** — providers differ in what their upstream APIs can filter. Each declares
this in `capabilities`, and the aggregator applies whatever is left in-memory, so *every* provider
returns correctly filtered results regardless of its API's limitations. There is a test that asserts
a capable and an incapable provider produce the same output for the same query.

**Interface segregation** — `NewsProvider` is three members wide. Optional abilities are data in
`capabilities`, not methods every implementation must stub out.

**Dependency inversion** — the aggregator depends on the `NewsProvider` interface and receives its
providers by injection. It has no knowledge of NewsAPI, the Guardian or the NYT, which is why its
whole test suite runs against fakes with no network at all.

**DRY** — one `Article` model (no vendor field name survives past its mapper); one `ArticleQuery`
schema shared by the client, the URL and the server, so filters cannot drift between layers; one
`fetchJson` carrying timeout, cache and error policy for all three providers; one `<ArticleMeta>`
for the byline row that appears five times in the design.

**KISS** — no state-management ceremony. Server data in TanStack Query, preferences in one small
Zustand store, transient filter state in the URL. The slide-in sheet is a native `<dialog>`, which
gives the focus trap, inert background and Escape-to-close for free instead of reimplementing them.

---

## Design

The UI implements the supplied mockup: centred `VOICE` wordmark between icon groups, the
ten-item section rail with an underlined active item, the hero story with its byline row and
display headline, the three sidebar stories separated by hairline rules, and the Trending authors
grid.

- **Type** — `Archivo` for display and headlines, `Inter` for UI and body copy. Both are
  self-hosted by `next/font`, so the container makes no runtime request to Google.
- **Icons** — Google **Material Symbols** (Rounded, weight 300), self-hosted from the
  `material-symbols` npm package. Wrapped in one `<Icon>` component.
- **Colour** — deliberately achromatic; colour comes from photography. Defined as CSS variables,
  which is what lets the included dark theme be a token swap rather than a second set of components.
- **Author avatars** — only the Guardian returns contributor headshots, so bylines without one get
  deterministic initials on a muted tint derived from the author's id (stable across server and
  client renders — a random tint would be a hydration mismatch).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run lint` | ESLint |
| `npm test` | Vitest (178 tests) |
| `npm run verify` | typecheck → lint → test → build |

### Tests

- **Mappers** (3 suites) covering real-shaped payloads including the awkward cases that actually
  occur: NewsAPI's `[Removed]` placeholders, email-wrapped bylines, protocol-relative images, the
  NYT's two different `multimedia` shapes, publication suffixes on headlines.
- **Aggregator** covering fan-out, partial failure, dedupe of syndicated copy, residual filtering,
  pagination, sorting, facet counting, and publication filtering. Driven entirely by fake providers,
  so the suite runs with no network.
- **Category resolution**, including a table driven by the exact section names the live APIs
  returned, and regression tests for every misclassification found along the way.
- **Query schema** covering URL round-tripping, and that a stale bookmark naming a retired category
  widens the results rather than returning a 400.

---

## Accessibility

Skip link; landmark regions; `aria-current` on the active section; `aria-pressed` on filter chips;
one consistent focus-visible treatment defined once in `globals.css`; live-region announcements for
result counts and pagination; alt text derived from headlines; `prefers-reduced-motion` respected;
and a native `<dialog>` for the menu so focus management is the platform's job, not ours.

---

## Trade-offs and known limits

- **Follower counts on the Trending authors rail are derived, not real.** No provider exposes such
  a metric. They are computed deterministically from the author's id so they are stable across
  renders; the *ranking* is genuine — it is that author's article count in the current feed.
- **Category mapping is exact for two sources and heuristic for one.** The Guardian and NYT declare
  a section, which is looked up directly. NewsAPI's `/everything` endpoint returns none, so those
  articles are classified from the publication (for single-subject outlets like ESPN or TechCrunch)
  and then from the headline. On a live sample roughly a quarter still land in the General bucket,
  which is honest: a headline like "What we learned this week" genuinely has no section.
- **"Top" ordering is a proxy.** These endpoints expose no popularity signal, so the front page
  ranks by how well-represented a publication is in the current feed, with recency breaking ties.
  "Latest" is strict reverse-chronological.
- **"Trending authors" is scoped to the current feed**, and says so with real numbers: each author's
  article count and how long ago they last filed, which are the two figures the ranking is computed
  from. Ranking is count first, recency second.

  An earlier version showed a follower count derived from a hash of the author's id. No source
  returns such a metric, so it was invented data presented as a statistic, and it is gone. That
  version also broke count ties alphabetically, which in a feed where most bylines appear once meant
  the rail rendered as a run of A-names rather than anything trending.
- **Article images are hotlinked** from publisher CDNs. `<ArticleImage>` retries once and then falls
  back to a neutral panel of identical dimensions, so a broken thumbnail never shifts the layout.
- **How much article text you get depends entirely on the source.** This is an API limit, not a
  design choice, and the reader page states which case you are in rather than presenting a teaser
  as though it were the article:

  | Source | What the API returns | Reader page shows |
  |---|---|---|
  | The Guardian | The **complete body** as HTML, via its fetch-by-id content endpoint | The whole article |
  | The New York Times | An abstract only. Article Search has no body field at all | The abstract, marked as an extract |
  | NewsAPI | `content` truncated at ~200 characters on the free tier | The extract, marked as such |

  Publisher attribution and a "read at the publisher" link are on the page in every case, which is
  both the honest thing and the licensing-safe one.

- **Guardian HTML is sanitised** against a strict allowlist (`sanitize-html`) before it is rendered,
  because injecting a third party's markup into our own origin is exactly what an allowlist is for.
  Nine tests cover the standard injection vectors.

- **Outbound links remain prominent.** The reader page always credits the publisher and offers a
  direct link to the original, which is what an aggregator should do.
- **NewsAPI's free plan is labelled development-use.** Its `localhost` restriction is a CORS rule
  on browser requests and does not affect this app, which calls the API server-side — but the plan
  is not intended for production traffic. See the note under [API keys](#api-keys).

---

## Further reading

[`IMPLEMENTATION.md`](./IMPLEMENTATION.md) — the plan this was built against: measured design
tokens, the provider abstraction in detail, step-by-step build order with acceptance criteria, and
the risk register.

---

## Licence

The source code is [MIT licensed](./LICENSE).

That covers this application's own code and nothing else. Headlines, article text, photographs and
the accompanying metadata are the property of the publishers who produced them and are served here
under each provider's API terms — see [NewsAPI](https://newsapi.org/terms),
[The Guardian Open Platform](https://www.theguardian.com/open-platform/terms-and-conditions) and
[the NYT developer terms](https://developer.nytimes.com/terms). Every article on this site credits
its publication and links back to the original, and no source's full text is republished beyond
what its API returns.
