"use client";

import Image from "next/image";
import { useState } from "react";
import type { ArticleImage as ArticleImageData } from "@/domain/article";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * Article photography.
 *
 * Alt text is the publisher's own, not the headline — a headline describes the
 * article, not the picture. Where no source supplies one the image is marked
 * decorative (`alt=""`) rather than given a misleading description.
 *
 * Aggregated thumbnails break constantly (expiry, hotlink protection, 404s), so
 * a failure falls back to a neutral panel in the same box, after one retry.
 */

interface ArticleImageProps {
  image: ArticleImageData | null;
  /** Fallback description used only when the publisher supplied none. */
  fallbackAlt?: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

export function ArticleImage({
  image,
  fallbackAlt,
  sizes,
  className,
  priority = false,
}: ArticleImageProps) {
  // One retry: a cold image-optimiser cache can time out on the first request.
  const [attempt, setAttempt] = useState(0);
  const failed = attempt > 1;

  if (!image || failed) {
    return (
      <div
        className={cn(
          "bg-surface-sunken flex items-center justify-center overflow-hidden",
          className,
        )}
        aria-hidden
      >
        <Icon name="newspaper" size={28} className="text-ink-faint" />
      </div>
    );
  }

  return (
    <div className={cn("bg-surface-sunken relative overflow-hidden", className)}>
      <Image
        key={attempt}
        src={image.url}
        alt={image.alt ?? fallbackAlt ?? ""}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setAttempt((count) => count + 1)}
        className="object-cover"
      />
    </div>
  );
}

/** Caption and photographer credit, straight from the publisher. */
export function ArticleImageCaption({ image }: { image: ArticleImageData | null }) {
  if (!image?.caption && !image?.credit) return null;

  return (
    <figcaption className="text-ink-faint mt-tight text-meta leading-relaxed">
      {image.caption}
      {image.caption && image.credit ? " " : null}
      {image.credit ? <span className="text-ink-faint/80">{image.credit}</span> : null}
    </figcaption>
  );
}
