import { describe, expect, it } from "vitest";
import { processImportedText } from "../note-importer";

describe("processImportedText (Note Import Assistant)", () => {
  it("removes page numbers, watermarks, and noise lines", () => {
    const raw = `
Header Title
Page 1 of 10
Sayfa 1

This is the main body paragraph.
All rights reserved
- 1 -
Another paragraph of actual content.
`;
    const result = processImportedText(raw, "lecture-notes.pdf");
    expect(result.markdown).not.toContain("Page 1 of 10");
    expect(result.markdown).not.toContain("Sayfa 1");
    expect(result.markdown).not.toContain("All rights reserved");
    expect(result.markdown).not.toContain("- 1 -");
    expect(result.markdown).toContain("This is the main body paragraph.");
    expect(result.markdown).toContain("Another paragraph of actual content.");
  });

  it("joins lines that were split mid-sentence by PDF line wrapping", () => {
    const raw = `
This is a sentence that was broken
across multiple lines due to PDF extraction.

Here is a hyphen-
ated word test.
`;
    const result = processImportedText(raw, "document.pdf");
    expect(result.markdown).toContain("This is a sentence that was broken across multiple lines due to PDF extraction.");
    expect(result.markdown).toContain("Here is a hyphenated word test.");
  });

  it("preserves Markdown code blocks, lists, and headers", () => {
    const raw = `
# Math Lecture 1

- First point
- Second point

\`\`\`javascript
const x = 42;
\`\`\`
`;
    const result = processImportedText(raw, "notes.md");
    expect(result.title).toBe("Math Lecture 1");
    expect(result.markdown).toContain("- First point");
    expect(result.markdown).toContain("const x = 42;");
  });

  it("flags garbled / OCR noise content with warning banner", () => {
    const garbledRaw = `\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD Scanned document content here`;
    const result = processImportedText(garbledRaw, "scan.pdf");
    expect(result.hasGarbledWarning).toBe(true);
    expect(result.markdown).toContain("⚠️ Some content may be unreadable due to OCR/extraction issues");
  });

  it("derives clean title from heading or file name", () => {
    const result1 = processImportedText("## Physics Mechanics\n\nContent here", "physics.pdf");
    expect(result1.title).toBe("Physics Mechanics");

    const result2 = processImportedText("Just plain text without heading", "my_study_notes.txt");
    expect(result2.title).toBe("my study notes");
  });
});
