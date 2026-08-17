import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The VOICE type scale, declared to `tailwind-merge`. Required, not optional:
 * our sizes come from custom `--text-*` tokens, which twMerge otherwise files
 * as colours and drops whenever a real colour follows —
 * `cn("text-nav", "text-ink-muted")` silently lost `text-nav`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "kicker",
            "meta",
            "nav",
            "body",
            "lead",
            "title-sm",
            "title-lg",
            "section",
            "display-sm",
            "display-md",
            "display-lg",
            "wordmark",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
