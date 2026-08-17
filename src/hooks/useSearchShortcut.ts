"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * `/` jumps to search, from anywhere in the app. Guarded so it never fires while
 * the reader is typing — otherwise a `/` mid-word navigates away.
 */
export function useSearchShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }

      event.preventDefault();
      router.push("/search");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}
