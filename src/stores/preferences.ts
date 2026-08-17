"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import type { Category, SourceId } from "@/domain/article";

/**
 * The reader's saved feed preferences, persisted to localStorage so the feed
 * survives a reload without an account. Anything derived is computed at the call
 * site rather than stored, so there is no second copy of the truth.
 */
export interface Preferences {
  sources: SourceId[];
  categories: Category[];
  authors: string[];
}

interface PreferencesStore extends Preferences {
  toggleSource: (id: SourceId) => void;
  toggleCategory: (id: Category) => void;
  toggleAuthor: (id: string) => void;
  clear: () => void;
}

const EMPTY: Preferences = { sources: [], categories: [], authors: [] };

/** Add if absent, remove if present — the one operation all three lists need. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...EMPTY,
      toggleSource: (id) => set((state) => ({ sources: toggle(state.sources, id) })),
      toggleCategory: (id) => set((state) => ({ categories: toggle(state.categories, id) })),
      toggleAuthor: (id) => set((state) => ({ authors: toggle(state.authors, id) })),
      clear: () => set({ ...EMPTY }),
    }),
    {
      // Bump on any shape change: a stale saved feed must not resolve to
      // values that no longer mean anything.
      name: "voice.preferences.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Hydration-safe read. The server has no localStorage, so reading the store
 * directly renders defaults on the server and saved values on the client — a
 * mismatch. `useSyncExternalStore`'s third argument is the server snapshot,
 * which avoids the extra render pass a `useEffect` guard would cost.
 *
 * Callers get `ready: false` until rehydration completes, so they can hold a
 * skeleton rather than flash "no preferences yet".
 */
export function usePreferences(): Preferences & { ready: boolean } {
  const ready = useSyncExternalStore(
    (onChange) => usePreferencesStore.persist.onFinishHydration(onChange),
    () => usePreferencesStore.persist.hasHydrated(),
    () => false,
  );

  const state = usePreferencesStore();

  return ready
    ? {
        sources: state.sources,
        categories: state.categories,
        authors: state.authors,
        ready,
      }
    : { ...EMPTY, ready };
}

/** How many preferences the reader has set. */
export function countPreferences(preferences: Preferences): number {
  return preferences.sources.length + preferences.categories.length + preferences.authors.length;
}

/** True when the reader has chosen at least one preference. */
export function hasPreferences(preferences: Preferences): boolean {
  return countPreferences(preferences) > 0;
}
