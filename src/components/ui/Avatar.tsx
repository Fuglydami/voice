import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Author } from "@/domain/article";

/**
 * Author avatar with an initials fallback.
 *
 * Only the Guardian returns contributor headshots, so most bylines have no
 * image. Rather than a grey placeholder, the initials are drawn on a tint
 * derived from the author's own id — deterministic, so the same writer always
 * gets the same colour on every render, server and client alike.
 */

interface AvatarProps {
  author: Author;
  size?: number;
  className?: string;
}

export function Avatar({ author, size = 20, className }: AvatarProps) {
  const dimension = { width: size, height: size };

  if (author.avatarUrl) {
    return (
      <Image
        src={author.avatarUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={dimension}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        className,
      )}
      style={{ ...dimension, backgroundColor: tintFor(author.id), fontSize: size * 0.4 }}
    >
      {initials(author.name)}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Muted, evenly spaced hues. Deliberately desaturated so the avatars never
 * compete with the photography — the palette of this design is achromatic.
 */
const TINTS = [
  "#4A4A4F",
  "#5B5F6B",
  "#6B5F52",
  "#4F5B57",
  "#5F5266",
  "#66575A",
  "#525F66",
  "#5C6152",
] as const;

function tintFor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return TINTS[sum % TINTS.length] ?? TINTS[0];
}
