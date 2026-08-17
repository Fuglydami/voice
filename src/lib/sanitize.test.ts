import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "./sanitize";

/**
 * The reader page injects publisher HTML with `dangerouslySetInnerHTML`, so
 * these tests exist to prove the allowlist actually holds. Every case here is a
 * standard injection vector rather than a hypothetical.
 */
describe("sanitizeArticleHtml", () => {
  it("keeps ordinary editorial markup", () => {
    const html = "<p>A <strong>bold</strong> claim.</p><h2>A heading</h2><blockquote>Quote</blockquote>";
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it("strips script tags and their contents", () => {
    const out = sanitizeArticleHtml('<p>Safe</p><script>alert("xss")</script>');
    expect(out).toBe("<p>Safe</p>");
    expect(out).not.toContain("alert");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeArticleHtml('<p onclick="steal()">Text</p>');
    expect(out).toBe("<p>Text</p>");
  });

  it("strips javascript: URLs", () => {
    const out = sanitizeArticleHtml('<a href="javascript:alert(1)">Click</a>');
    expect(out).not.toContain("javascript:");
  });

  it("strips iframes", () => {
    expect(sanitizeArticleHtml('<iframe src="https://evil.test"></iframe>')).toBe("");
  });

  it("strips style tags, which can be used to overlay the page", () => {
    const out = sanitizeArticleHtml("<style>body{display:none}</style><p>Text</p>");
    expect(out).toBe("<p>Text</p>");
  });

  it("marks outbound links so they cannot reach back through window.opener", () => {
    const out = sanitizeArticleHtml('<a href="https://example.com">Link</a>');
    expect(out).toContain('rel="noreferrer noopener"');
    expect(out).toContain('target="_blank"');
  });

  it("keeps https images but drops other schemes", () => {
    expect(sanitizeArticleHtml('<img src="https://cdn.test/a.jpg" alt="A">')).toContain("cdn.test");
    expect(sanitizeArticleHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">')).not.toContain(
      "data:",
    );
  });

  it("preserves the Guardian's live-blog block structure", () => {
    const out = sanitizeArticleHtml(
      '<div class="block"><p class="block-time"><time datetime="2026-08-14T20:37:32Z">9.37pm</time></p></div>',
    );
    expect(out).toContain("block-time");
    expect(out).toContain("<time");
  });
});
