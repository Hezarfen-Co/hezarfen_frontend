import { isRichTextEmpty, richTextExcerpt, sanitizeRichText, toRichTextHtml } from "@/lib/rich-text";

describe("rich-text", () => {
  it("strips scripts, handlers and unknown tags but keeps formatting", () => {
    const html = sanitizeRichText('<h2>Plan</h2><p onclick="x()">Hi <strong>there</strong><img src=x onerror=alert(1)><script>alert(1)</script></p>');
    expect(html).toBe("<h2>Plan</h2><p>Hi <strong>there</strong></p>");
  });

  it("drops javascript links and opens real ones in a new tab", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript");
    expect(sanitizeRichText('<a href="https://example.com">x</a>')).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>');
  });

  it("turns imported markdown-ish text into blocks", () => {
    expect(toRichTextHtml("## Unit 1\n\nFirst line\nsecond line\n\n- a\n- b\n1. one")).toBe(
      "<h2>Unit 1</h2><p>First line<br>second line</p><ul><li>a</li><li>b</li></ul><ol><li>one</li></ol>",
    );
    expect(toRichTextHtml("a < b")).toBe("<p>a &lt; b</p>");
  });

  it("reads excerpts and emptiness from the text, not the markup", () => {
    expect(richTextExcerpt("<h2>Title</h2><p>Body   text</p>")).toBe("Title Body text");
    expect(richTextExcerpt("<p>abcdef</p>", 3)).toBe("abc…");
    expect(isRichTextEmpty("<p><br></p>")).toBe(true);
    expect(isRichTextEmpty("<p>x</p>")).toBe(false);
  });
});
