import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Sanitises publisher HTML before it reaches `dangerouslySetInnerHTML`. The
 * Guardian returns bodies as raw HTML; the trust boundary is the network, not
 * the brand, so an allowlist applies regardless of the source's reputation.
 */

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "h2",
    "h3",
    "h4",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "figure",
    "figcaption",
    "img",
    "time",
    "span",
    "aside",
  ],
  allowedAttributes: {
    // `target` and `rel` must be allowed here or the transform below adds them
    // and the allowlist immediately strips them again, leaving outbound links
    // in article bodies exposed to reverse tabnabbing.
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    time: ["datetime"],
    "*": ["class"],
  },
  // No protocol-relative or javascript: URLs.
  allowedSchemes: ["https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    // Every outbound link leaves our origin, so make that safe and explicit.
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noreferrer noopener",
    }),
  },
  // Drop the contents of anything disallowed rather than leaving stray text.
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "iframe"],
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
