"use client";

import { useEffect, useState } from "react";

/**
 * A progress bar pinned under the masthead on the reader page — Guardian bodies
 * run past three thousand words and nothing else says how much is left.
 *
 * The value is written to a CSS custom property inside `requestAnimationFrame`,
 * so scrolling never re-renders the tree.
 */
export function ReadingProgress() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const bar = document.getElementById("reading-progress");
    if (!bar) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;

      // Nothing to track on a short article, and a bar stuck at 100% would be
      // noise rather than information.
      if (scrollable < 400) {
        setVisible(false);
        return;
      }

      setVisible(true);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      bar.style.setProperty("--progress", String(progress));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      id="reading-progress"
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="bg-brand h-full origin-left transition-opacity"
        style={{ transform: "scaleX(var(--progress, 0))" }}
      />
    </div>
  );
}
