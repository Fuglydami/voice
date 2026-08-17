import { cn } from "@/lib/utils";

/**
 * Google Material Symbols, rendered as a ligature.
 *
 * The icon set is wrapped in one component so the font family, optical weight
 * and the `aria-hidden` default live in a single place — swapping icon sets
 * later is a one-file change rather than a find-and-replace across the app.
 *
 * The font is self-hosted from the `material-symbols` npm package (imported in
 * `globals.css`), so nothing is fetched from Google at runtime.
 */

export type IconName =
  | "search"
  | "menu"
  | "close"
  | "account_circle"
  | "north_east"
  | "arrow_forward"
  | "arrow_back"
  | "tune"
  | "check"
  | "calendar_today"
  | "filter_list"
  | "bookmark"
  | "notifications"
  | "person"
  | "error"
  | "info"
  | "newspaper"
  | "expand_more"
  | "dark_mode"
  | "light_mode";

interface IconProps {
  name: IconName;
  /** Rendered size in pixels — Material Symbols is sized by font-size. */
  size?: number;
  className?: string;
  /** Supply only when the icon is the sole content of a control. */
  label?: string;
}

export function Icon({ name, size = 20, className, label }: IconProps) {
  return (
    <span
      className={cn("material-symbols-rounded inline-block leading-none", className)}
      style={{ fontSize: size, width: size, height: size }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
