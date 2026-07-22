import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

export type ImportResult = {
  title: string;
  markdown: string;
  hasGarbledWarning: boolean;
};

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc =
    typeof window === "undefined"
      ? new URL("../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).href
      : pdfWorkerUrl;
  return pdfjs;
}

export async function extractImportedPdfText(file: Blob): Promise<string> {
  const { getDocument } = await loadPdfJs();
  const loadingTask = getDocument({
    data: await file.arrayBuffer(),
    useWorkerFetch: false,
  });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if (!("str" in item)) return "";
          return item.hasEOL ? `${item.str}\n` : `${item.str} `;
        })
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      if (pageText) pages.push(pageText);
      page.cleanup();
    }

    return pages.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Note Import Assistant
 * Converts raw extracted text from PDF, TXT, or MD into a clean, well-structured note.
 */
export function processImportedText(rawText: string, fileName?: string): ImportResult {
  if (!rawText || !rawText.trim()) {
    const defaultTitle = deriveTitle(fileName, "");
    return { title: defaultTitle, markdown: "", hasGarbledWarning: false };
  }

  // 1. Check for garbled / OCR issues
  const isGarbled = checkGarbledRatio(rawText);

  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove noise: page numbers, headers/footers, watermarks
  text = removeNoise(text);

  // 3. Fix broken line-wrapping from PDF extraction
  text = fixPdfLineWrapping(text);

  // 4. Reformat into clean Markdown structure
  text = formatMarkdownStructure(text);

  // 5. Prepend garbled warning if content has OCR issues
  const warning = "⚠️ Some content may be unreadable due to OCR/extraction issues";
  if (isGarbled && !text.startsWith(warning)) {
    text = `${warning}\n\n${text}`;
  }

  const title = deriveTitle(fileName, text);

  return {
    title,
    markdown: text.trim(),
    hasGarbledWarning: isGarbled,
  };
}

/** Detect if content is heavily garbled (scanned OCR noise or binary extraction junk) */
function checkGarbledRatio(text: string): boolean {
  if (!text.trim()) return false;
  // Count replacement characters, unprintable control characters, or repeated non-word noise
  const replacementChars = (text.match(/\uFFFD/g) || []).length;
  const nonAsciiControl = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  const total = text.length;

  if (total === 0) return false;
  const ratio = (replacementChars + nonAsciiControl) / total;
  return ratio > 0.05 || (replacementChars > 5 && ratio > 0.02);
}

/** Remove page numbers, repeated headers/footers, and watermarks */
function removeNoise(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];

  const noisePatterns = [
    /^\s*(page|sayfa)\s+\d+\s*(of|\/|-)?\s*\d*\s*$/i,
    /^\s*-\s*\d+\s*-\s*$/,
    /^\s*\d+\s*\/\s*\d+\s*$/,
    /^\s*(confidential|gizli|draft|taslak|all rights reserved|tüm hakları saklıdır)\s*$/i,
    /^\s*downloaded from .*\s*$/i,
    /^\s*watermark\s*$/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleaned.push("");
      continue;
    }

    const isNoise = noisePatterns.some((pattern) => pattern.test(trimmed));
    if (!isNoise) {
      cleaned.push(line);
    }
  }

  return cleaned.join("\n");
}

/** Join lines that were split mid-sentence by PDF line wrapping */
function fixPdfLineWrapping(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    let current = lines[i];

    // If current line ends with a hyphen and next line starts with a letter, join hyphenated word
    if (i < lines.length - 1 && /[-–]\s*$/.test(current) && /^[a-zçğıöşü]/i.test(lines[i + 1].trim())) {
      const nextLine = lines[i + 1].trim();
      current = current.replace(/[-–]\s*$/, "") + nextLine;
      i += 1;
    }
    // If line ends mid-sentence without terminal punctuation (. : ! ? # - | `) and next line starts with lowercase or continuation
    else if (
      i < lines.length - 1 &&
      current.trim().length > 0 &&
      lines[i + 1].trim().length > 0 &&
      !/[.:!?#\-|`]\s*$/.test(current.trim()) &&
      !/^(#+|\*+|-+|\d+\.)\s/.test(lines[i + 1].trim()) &&
      /^[a-zçğıöşü,\(]/i.test(lines[i + 1].trim())
    ) {
      current = `${current.trim()} ${lines[i + 1].trim()}`;
      i += 1;
    }

    result.push(current);
  }

  return result.join("\n");
}

/** Reformat paragraphs, headers, and bullet points into clean Markdown */
function formatMarkdownStructure(text: string): string {
  const lines = text.split("\n");
  const formatted: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      formatted.push(line);
      continue;
    }

    if (inCodeBlock) {
      formatted.push(line);
      continue;
    }

    if (!trimmed) {
      if (formatted.length > 0 && formatted[formatted.length - 1] !== "") {
        formatted.push("");
      }
      continue;
    }

    // Preserve existing headers, quotes, lists, or tables
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      /^\d+\.\s/.test(trimmed) ||
      trimmed.startsWith("|")
    ) {
      formatted.push(trimmed);
      continue;
    }

    // Detect potential section headers (short uppercase/title case lines without trailing punctuation)
    const isShortHeader =
      trimmed.length < 60 &&
      !/[.,:!?]$/.test(trimmed) &&
      (trimmed === trimmed.toUpperCase() || /^[A-ZÇĞİÖŞÜ0-9\s:-]+$/.test(trimmed));

    if (isShortHeader && trimmed.length > 3) {
      formatted.push(`## ${toTitleCase(trimmed)}`);
      continue;
    }

    formatted.push(trimmed);
  }

  // Deduplicate consecutive blank lines
  return formatted
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function toTitleCase(str: string): string {
  if (str === str.toUpperCase() && str.length > 4) {
    return str
      .toLowerCase()
      .replace(/(?:^|\s|-)\S/g, (m) => m.toUpperCase());
  }
  return str;
}

/** Extract title from Markdown heading or fallback to file name */
function deriveTitle(fileName?: string, markdownText?: string): string {
  if (markdownText) {
    const headingMatch = markdownText.match(/^#+\s*(.+)$/m);
    if (headingMatch && headingMatch[1].trim()) {
      const heading = headingMatch[1].replace(/^[⚠️\s]+/, "").trim();
      if (heading.length > 0 && heading.length <= 100) {
        return heading;
      }
    }
  }

  if (fileName) {
    const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
    if (cleanName) {
      return cleanName;
    }
  }

  return "Imported Note";
}
