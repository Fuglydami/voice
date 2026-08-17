"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";

/**
 * Light/dark switch. Light is the default and the system preference is not
 * consulted — dark is a deliberate choice, remembered in localStorage.
 *
 * The DOM is the source of truth, not React state: the no-flash script in
 * `layout.tsx` sets `data-theme` before first paint, so the button can never
 * disagree with what the page is showing.
 */

const STORAGE_KEY = "voice.theme";

type Theme = "light" | "dark";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // Keeps two open tabs in step.
  window.addEventListener("storage", onChange);

  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  // The server snapshot is "light", matching the pre-paint default, so the
  // first client render agrees with the server-rendered markup.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Private browsing can refuse storage. The toggle still works for
          // this page view; it simply will not be remembered.
        }
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={20} />
    </Button>
  );
}

/**
 * Runs before first paint to apply a stored dark preference, so a reader who
 * chose dark never sees a white flash on navigation. Light needs no script: it
 * is the default the stylesheet already renders.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark"){document.documentElement.dataset.theme="dark"}}catch(e){}})();`;
