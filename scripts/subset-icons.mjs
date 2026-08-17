import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

/**
 * Cuts the Material Symbols font down to the icons this app actually draws.
 *
 * The published font is a 4.95 MB variable font carrying roughly three thousand
 * icons and four variation axes. We use twenty icons at one fixed weight. On
 * localhost the difference is invisible; over a real network it meant several
 * seconds where every icon rendered as its own ligature text — a masthead
 * reading "search person dark_mode" — because the font had not arrived before
 * `font-display: block` gave up and showed the fallback.
 *
 * Pinning the axes is what makes the difference: subsetting by glyph alone only
 * removes about a fifth, since the variation data dominates. Pinned to the
 * values `globals.css` actually asks for, the file lands around 270 KB.
 *
 * The icon list is parsed from the `IconName` union rather than duplicated here,
 * so adding an icon to the type and re-running this cannot drift out of sync.
 *
 * Run with `npm run icons:subset`. The output is committed, so neither the app
 * build nor the Docker image needs this script or its dependency.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const SOURCE = resolve(root, "node_modules/material-symbols/material-symbols-rounded.woff2");
const ICON_TS = resolve(root, "src/components/ui/Icon.tsx");
const OUTPUT = resolve(root, "src/app/fonts/material-symbols-rounded-subset.woff2");

/** Must match the `font-variation-settings` in `globals.css`. */
const AXES = { wght: 300, FILL: 0, GRAD: 0, opsz: 24 };

function readIconNames() {
  const source = readFileSync(ICON_TS, "utf8");
  const union = source.split("export type IconName =")[1]?.split(";")[0];

  if (!union) {
    throw new Error(`Could not find the IconName union in ${ICON_TS}`);
  }

  const names = [...union.matchAll(/"([a-z0-9_]+)"/g)].map((match) => match[1]);

  if (names.length === 0) {
    throw new Error("IconName union parsed but contained no icon names");
  }

  return names;
}

const names = readIconNames();
const source = readFileSync(SOURCE);

// Ligature names are the text: "search" renders the search glyph. Subsetting on
// the joined names keeps every glyph those ligatures resolve to.
const subset = await subsetFont(source, names.join(" "), {
  targetFormat: "woff2",
  variationAxes: AXES,
});

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, subset);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(`icons:  ${names.length} (${names.join(", ")})`);
console.log(`source: ${kb(source.length)}`);
console.log(`subset: ${kb(subset.length)}  (${(100 - (subset.length / source.length) * 100).toFixed(1)}% smaller)`);
console.log(`wrote:  ${OUTPUT.replace(root + "/", "")}`);
