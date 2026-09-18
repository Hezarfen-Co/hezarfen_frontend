import type { RagOutput } from "@/api/client";

const SUMMARY_KEYS = ["summary", "ozet", "özet", "content", "text", "answer"];
const POINT_KEYS = ["keywords", "key_points", "topics", "questions", "highlights"];
/** Payload entries the drawer renders on their own; the rest land in `fields`. */
const RENDERED_KEYS: Record<string, true> = {
  summary: true,
  ozet: true,
  "özet": true,
  content: true,
  text: true,
  answer: true,
  keywords: true,
  key_points: true,
  topics: true,
  questions: true,
  highlights: true,
  files: true,
  failed: true,
  course_note: true,
  passages: true,
  passages_truncated: true,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** The payload's own prose, whatever key the service used for it. */
export function payloadText(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  const record = asRecord(payload);
  if (!record) return "";
  for (const key of SUMMARY_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** The payload's list-shaped highlights, whatever key the service used. */
export function payloadPoints(payload: unknown): string[] {
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of POINT_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) {
      const rows = value.filter((item): item is string => typeof item === "string" && !!item.trim());
      if (rows.length > 0) return rows;
    }
  }
  return [];
}

/** Attachment id → name, for the ids the service recorded in `payload.files`. */
export function payloadFileNames(payload: unknown): Map<string, string> {
  const names = new Map<string, string>();
  const files = asRecord(payload)?.files;
  if (!Array.isArray(files)) return names;
  for (const entry of files) {
    const file = asRecord(entry);
    const name = typeof file?.name === "string" && file.name.trim() ? file.name.trim() : null;
    if (!name) continue;
    for (const idKey of ["id", "doc_id"]) {
      const id = file?.[idKey];
      if (typeof id === "string" && id && !names.has(id)) names.set(id, name);
    }
  }
  return names;
}

export type RagOutputDocument = {
  /** The produced prose — the summary the service wrote. */
  summary: string;
  points: string[];
  /** Attachment names in the order the output listed them; never raw ids. */
  sourceNames: string[];
  /** Stored attachment ids whose name the payload does not carry. */
  unnamedSources: number;
  failed: string[];
  /** The indexed chunks the service handed back, in the order it wrote them. */
  passages: RagOutputPassage[];
  /** The service dropped passages above its response budget. */
  passagesTruncated: boolean;
  /** The payload's own `chunks` — the total it indexed — when it recorded one. */
  chunksTotal: number | null;
  /** Payload entries with no dedicated rendering, in payload order. */
  fields: Array<{ key: string; value: unknown }>;
  raw: unknown;
};

/** One indexed chunk as the service returned it — the extraction, readable. */
export type RagOutputPassage = {
  /** The attachment the passage came from, by name; null when unresolvable. */
  sourceName: string | null;
  /** The passage came from the note's own text, not from an attachment. */
  fromNote: boolean;
  /** The chunk's own text, verbatim. */
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
};

/** The note key the answer stamps its own body chunks with — the payload's own
 * `course_note` first, the stored row's link as the fallback. */
function payloadNoteKey(record: Record<string, unknown> | null, output: RagOutput): string {
  if (typeof record?.course_note === "string" && record.course_note) return record.course_note;
  return typeof output.course_note === "string" ? output.course_note : "";
}

/** The passages the service recorded, dropping entries with no readable text. */
function payloadPassages(
  record: Record<string, unknown> | null,
  names: Map<string, string>,
  noteId: string,
): RagOutputPassage[] {
  if (!Array.isArray(record?.passages)) return [];
  const pages = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? value : null);
  const passages: RagOutputPassage[] = [];
  for (const entry of record.passages) {
    const passage = asRecord(entry);
    if (typeof passage?.text !== "string" || !passage.text.trim()) continue;
    const docId = typeof passage.doc_id === "string" ? passage.doc_id : "";
    passages.push({
      sourceName: (docId ? names.get(docId) : undefined) ?? null,
      // The service stamps the note's own chunks with the note key, not a file id.
      fromNote: docId !== "" && docId === noteId,
      text: passage.text,
      pageStart: pages(passage.page_start),
      pageEnd: pages(passage.page_end),
    });
  }
  return passages;
}

/**
 * Read one stored AI output into everything the drawer shows. The payload is
 * the service's own object served unread, so every read here is defensive: a
 * shape the service did not send degrades to an empty value, never a crash.
 */
export function readRagOutputDocument(output: RagOutput): RagOutputDocument {
  const raw = output.payload;
  const record = asRecord(raw);
  const names = payloadFileNames(raw);
  const storedSources = Array.isArray(output.sources) ? output.sources : [];

  const sourceNames: string[] = [];
  let unnamedSources = 0;
  if (storedSources.length > 0) {
    for (const id of storedSources) {
      const name = names.get(id);
      if (name) {
        if (!sourceNames.includes(name)) sourceNames.push(name);
      } else {
        unnamedSources += 1;
      }
    }
  } else {
    // No stored id list — fall back to the names the payload itself recorded.
    for (const name of new Set(names.values())) sourceNames.push(name);
  }

  const failed = Array.isArray(record?.failed)
    ? record.failed.filter((item): item is string => typeof item === "string" && !!item.trim()).map((item) => item.trim())
    : [];

  return {
    summary: payloadText(raw),
    points: payloadPoints(raw),
    sourceNames,
    unnamedSources,
    failed,
    passages: payloadPassages(record, names, payloadNoteKey(record, output)),
    passagesTruncated: record?.passages_truncated === true,
    chunksTotal: typeof record?.chunks === "number" && Number.isFinite(record.chunks) ? record.chunks : null,
    fields: record
      ? Object.entries(record)
        .filter(([key]) => !RENDERED_KEYS[key])
        .map(([key, value]) => ({ key, value }))
      : [],
    raw,
  };
}

export type RagOutputMarkdownLabels = {
  date: string;
  note: string;
  sources: string;
  failed: string;
  otherFields: string;
  /** Heading of the extracted-text section. */
  passages: string;
  /** One passage's heading: source name and page range, never a raw id. */
  passageHeader: (passage: RagOutputPassage) => string;
  /** Honest note when the service dropped passages; "" when it did not. */
  passagesTruncated: string;
};

/**
 * The downloadable document: title, date, note, sources, body — built from the
 * same view the drawer renders, in plain Markdown a teacher can open anywhere.
 */
export function buildRagOutputMarkdown(input: {
  title: string;
  date: string;
  noteTitle?: string;
  document: RagOutputDocument;
  labels: RagOutputMarkdownLabels;
}): string {
  const { document: doc, labels } = input;
  const lines: string[] = [`# ${input.title}`, ""];
  lines.push(`- **${labels.date}:** ${input.date}`);
  if (input.noteTitle?.trim()) lines.push(`- **${labels.note}:** ${input.noteTitle.trim()}`);
  if (doc.sourceNames.length > 0 || doc.unnamedSources > 0) {
    const named = [...doc.sourceNames];
    if (doc.unnamedSources > 0) named.push(`(${doc.unnamedSources})`);
    lines.push(`- **${labels.sources}:** ${named.join(", ")}`);
  }
  lines.push("");
  if (doc.summary) {
    lines.push(doc.summary, "");
  }
  if (doc.points.length > 0) {
    for (const point of doc.points) lines.push(`- ${point}`);
    lines.push("");
  }
  if (doc.failed.length > 0) {
    lines.push(`## ${labels.failed}`, "");
    for (const name of doc.failed) lines.push(`- ${name}`);
    lines.push("");
  }
  if (doc.passages.length > 0) {
    lines.push(`## ${labels.passages}`, "");
    for (const passage of doc.passages) {
      lines.push(`**${labels.passageHeader(passage)}**`, "", passage.text, "");
    }
    if (doc.passagesTruncated && labels.passagesTruncated) lines.push(labels.passagesTruncated, "");
  }
  if (doc.fields.length > 0) {
    lines.push(`## ${labels.otherFields}`, "");
    for (const field of doc.fields) lines.push(`- **${field.key}:** ${fieldValueText(field.value)}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * One value → one line of text. Exported so the drawer's field list and the
 * Markdown export render unknown payload values identically.
 */
export function fieldValueText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value) ?? String(value);
}

/** Deterministic download name: `yz-cikti-YYYYMMDD-HHmm.md`. */
export function ragOutputFileName(generatedAt: number): string {
  const d = new Date(generatedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `yz-cikti-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.md`;
}
