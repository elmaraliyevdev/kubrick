import DOMPurify from "dompurify";

/** Safe HTML for job descriptions (public + internal views). */
export function sanitizeJobDescriptionHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty || "", {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "a",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ADD_ATTR: ["target", "rel"],
  });
}

/** Plain text for validation and backend parsers (strip tags). */
export function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") {
    return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

/**
 * Legacy jobs may store plain text. Wrap as HTML for the rich editor / display.
 */
export function legacyDescriptionToHtml(raw: string): string {
  const t = raw?.trim() ?? "";
  if (!t) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return t
    .split(/\n\n+/)
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}
