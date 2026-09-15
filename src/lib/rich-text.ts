import DOMPurify from "dompurify";

// Note bodies are stored as HTML written by the contentEditable editor, and
// course notes render for every enrolled student — so anything that reaches
// `innerHTML`, stored or pasted, goes through this allow-list first.
const ALLOWED_TAGS = ["p", "div", "br", "h2", "h3", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li", "blockquote", "pre", "code", "a", "span"];
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeRichText(html: string): string {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false });
  // Links open outside the app without handing it the opener.
  const template = document.createElement("template");
  template.innerHTML = clean;
  for (const link of template.content.querySelectorAll("a")) {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }
  return template.innerHTML;
}

/** Plain text of a stored body, whitespace collapsed — for card excerpts, never rendered as HTML. */
export function richTextExcerpt(html: string, maxLength = 280): string {
  const doc = new DOMParser().parseFromString(html.replace(/<\/(p|div|h2|h3|li|blockquote|pre)>|<br\s*\/?>/gi, "$& "), "text/html");
  const text = (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

/** True when a body holds no visible text — an editor left with `<p><br></p>` counts as empty. */
export function isRichTextEmpty(html: string): boolean {
  return richTextExcerpt(html, 1) === "";
}

const HTML_TAG = /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i;

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * HTML for a stored note body. Editor-written bodies are HTML already; bodies
 * from the Note Import Assistant (and older plain-text notes) are Markdown-ish
 * text, which used to be shown with `pre-wrap`. Those get their headings,
 * lists and paragraphs back as real blocks instead of one run-on line.
 */
export function toRichTextHtml(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  if (HTML_TAG.test(stored)) return sanitizeRichText(stored);

  const out: string[] = [];
  type OpenList = { tag: "ul" | "ol"; items: string[] };
  let list = null as OpenList | null;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  for (const raw of stored.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      out.push(`<${heading[1].length <= 2 ? "h2" : "h3"}>${escapeHtml(heading[2])}</${heading[1].length <= 2 ? "h2" : "h3"}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      if ((list as OpenList | null)?.tag !== tag) flushList();
      const open: OpenList = (list as OpenList | null) ?? { tag, items: [] };
      list = open;
      open.items.push(escapeHtml((bullet ?? numbered)![1]));
    } else {
      flushList();
      paragraph.push(escapeHtml(line));
    }
  }
  flushParagraph();
  flushList();
  return out.join("");
}
