"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Icon } from "@/components/ui/Icon";

/**
 * The keyword input. Local state keeps typing responsive and the debounced value
 * is pushed up; each request fans out to three rate-limited APIs.
 *
 * The parent's value is mirrored back during render — React's documented pattern
 * for deriving state from props. The upward push cannot use it: adjusting state
 * during render is only legal for a component's *own* state, and `onChange` here
 * calls `router.replace`, so doing it mid-render updated the router while this
 * component was rendering. It happens in an effect instead.
 */
export function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = "Search headlines, authors and publications",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [lastSynced, setLastSynced] = useState(value);
  const debounced = useDebouncedValue(draft);

  if (value !== lastSynced) {
    setLastSynced(value);
    setDraft(value);
  }

  // In a ref so the effect depends only on `debounced` — an inline `onChange`
  // prop would otherwise re-fire the push on every parent render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Only when the settled value differs from the parent's, or this fights the
  // back button.
  const lastPushed = useRef(value);
  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    if (debounced !== value) onChangeRef.current(debounced);
  }, [debounced, value]);

  return (
    <div className="relative flex-1">
      <label htmlFor={id} className="sr-only">
        Search articles by keyword
      </label>

      <Icon
        name="search"
        size={19}
        className="text-ink-faint pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
      />

      <input
        id={id}
        type="search"
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onChange(draft);
            onSubmit?.();
          }
        }}
        placeholder={placeholder}
        className="border-rule bg-surface text-ink placeholder:text-ink-faint focus:border-ink w-full rounded-full border py-3 pr-11 pl-11 text-nav outline-none transition-colors"
      />

      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          className="text-ink-faint hover:text-ink absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 transition-colors"
        >
          <Icon name="close" size={17} label="Clear search" />
        </button>
      ) : null}
    </div>
  );
}
