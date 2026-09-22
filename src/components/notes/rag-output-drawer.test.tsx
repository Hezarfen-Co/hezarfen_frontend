import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RagOutput } from "@/api/client";
import { RagOutputDrawer } from "@/components/notes/rag-output-drawer";
import {
  buildRagOutputMarkdown,
  readRagOutputDocument,
  type RagOutputDocument,
  type RagOutputMarkdownLabels,
} from "@/components/notes/rag-output-document";
import { ragOutputMessage, ragOutputPassagePages } from "@/components/notes/rag-output-messages";
import { RagOutputsPanel } from "@/components/notes/rag-outputs-panel";
import { formatDateTime } from "@/lib/format";
import type { NoteFileSource } from "@/lib/note-source";
import { PreferencesProvider } from "@/stores/preferences-context";

const aiApi = vi.hoisted(() => ({ getAiCapabilities: vi.fn() }));
const toastApi = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("@/api/ai", () => aiApi);
vi.mock("@/components/ui/toast", () => ({ showToast: toastApi.showToast, Toaster: () => null }));

const CAPABILITIES_WITH_RAG = {
  enabled: true,
  protocol: "hab/2",
  capabilities: [{ capability: "rag.index", workers: 1, inflight: 0 }],
};

const NOTE_TITLE = "Hücre ve Canlılar";
const SUMMARY = "Hücre konusu 18 parçaya bölünerek indekslendi.";
const GENERATED_AT = Date.UTC(2026, 8, 18, 11, 30);

const HEALTHY: RagOutput = {
  id: "output-1",
  course_note: "note-1",
  course: "course-1",
  sources: ["file-aaa1", "file-bbb2"],
  generated_at: GENERATED_AT,
  payload: {
    course_note: "note-1",
    chunks: 18,
    summary: SUMMARY,
    keywords: ["hücre zarı", "organel"],
    files: [
      { id: "file-aaa1", doc_id: "doc-ccc3", name: "hücre-notu.pdf" },
      { id: "file-bbb2", doc_id: "doc-ddd4", name: "organeller.pdf" },
    ],
    failed: [],
  },
};

const PASSAGE_TEXT_1 = "Hücre zarı seçici geçirgendir; madde alışverişini düzenler.\nZar proteinleri taşımayı üstlenir.";
const PASSAGE_TEXT_2 = "Mitokondri, oksijenli solunumla ATP üretir.";

/** HEALTHY's payload with extra keys — the shape the service evolved into. */
function withPassages(extra: Record<string, unknown>): RagOutput {
  return { ...HEALTHY, payload: { ...(HEALTHY.payload as Record<string, unknown>), ...extra } };
}

const WITH_PASSAGES = withPassages({
  passages: [
    { chunk_id: "chunk-1", doc_id: "doc-ccc3", text: PASSAGE_TEXT_1, page_start: 3, page_end: 4 },
    { chunk_id: "chunk-2", doc_id: "doc-ddd4", text: PASSAGE_TEXT_2, page_start: 5, page_end: 5 },
  ],
  passages_truncated: false,
});

const WITH_TRUNCATED = withPassages({
  passages: [
    { chunk_id: "chunk-1", doc_id: "doc-ccc3", text: PASSAGE_TEXT_1, page_start: 3, page_end: 4 },
    { chunk_id: "chunk-2", doc_id: "doc-ddd4", text: PASSAGE_TEXT_2, page_start: 5, page_end: 5 },
  ],
  passages_truncated: true,
});

/** The service stamps the note's own body chunks with the note key. */
const WITH_NOTE_PASSAGE = withPassages({
  passages: [
    { chunk_id: "01NOTE:01NOTE:c0", doc_id: "note-1", text: PASSAGE_TEXT_2, page_start: null, page_end: null },
  ],
});

function markdownLabels(document: RagOutputDocument): RagOutputMarkdownLabels {
  return {
    date: ragOutputMessage("en", "date"),
    note: ragOutputMessage("en", "note"),
    sources: ragOutputMessage("en", "sources"),
    failed: ragOutputMessage("en", "failedTitle"),
    otherFields: ragOutputMessage("en", "otherFields"),
    passages: ragOutputMessage("en", "passages"),
    passageHeader: (passage) => {
      const source = passage.sourceName
        ?? (passage.fromNote ? NOTE_TITLE : ragOutputMessage("en", "unnamedSource"));
      const pages = ragOutputPassagePages("en", passage.pageStart, passage.pageEnd);
      return pages ? `${source} · ${pages}` : source;
    },
    passagesTruncated: document.passagesTruncated
      ? document.chunksTotal != null
        ? ragOutputMessage("en", "passagesTruncated", { shown: document.passages.length, total: document.chunksTotal })
        : ragOutputMessage("en", "passagesTruncatedNoTotal", { shown: document.passages.length })
      : "",
  };
}

function expectedMarkdown(output: RagOutput) {
  const document = readRagOutputDocument(output);
  return buildRagOutputMarkdown({
    title: NOTE_TITLE,
    date: formatDateTime(output.generated_at, "en"),
    noteTitle: NOTE_TITLE,
    document,
    labels: markdownLabels(document),
  });
}

/** The drawer's extracted-text section, so raw-record assertions stay scoped. */
function passagesSection(): HTMLElement {
  return screen.getByText("Extracted text").closest("div") as HTMLElement;
}

function stubSource(output: RagOutput): NoteFileSource {
  return {
    maxFiles: 10,
    listFiles: async () => ({ items: [], total: 0, limit: 10, offset: 0 }),
    uploadFile: async () => {
      throw new Error("not used by this panel");
    },
    deleteFile: async () => {},
    fileUrl: () => "",
    fileBlob: async () => new Blob(),
    listRagOutputs: async () => ({ items: [output], total: 1, limit: 10, offset: 0 }),
    deleteRagOutput: async () => {},
    reindexRag: async () => {},
  };
}

function renderPanel(output: RagOutput) {
  render(() => (
    <PreferencesProvider>
      <RagOutputsPanel noteId="note-1" active source={stubSource(output)} noteTitle={NOTE_TITLE} />
    </PreferencesProvider>
  ));
}

function renderDrawer(output: RagOutput) {
  render(() => (
    <PreferencesProvider>
      <RagOutputDrawer output={output} noteTitle={NOTE_TITLE} onOpenChange={() => {}} />
    </PreferencesProvider>
  ));
}

const writeText = vi.fn<(text: string) => Promise<void>>();
const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:test");
const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

describe("RagOutputDrawer", () => {
  beforeEach(() => {
    aiApi.getAiCapabilities.mockResolvedValue(CAPABILITIES_WITH_RAG);
    writeText.mockResolvedValue();
    writeText.mockClear();
    createObjectURL.mockClear();
    clickSpy.mockClear();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: () => {}, configurable: true });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("hezarfen.locale");
    vi.clearAllMocks();
  });

  it("renders the stored output inline and exposes grouped actions", async () => {
    renderPanel(HEALTHY);
    await waitFor(() => expect(screen.getByText(SUMMARY)).toBeTruthy());

    expect(screen.getByText("Preview")).toBeTruthy();
    expect(screen.getByText("hücre zarı")).toBeTruthy();
    expect(screen.getByText("organel")).toBeTruthy();
    // Delete sits inside the shared actions menu, never as a bare icon button.
    expect(screen.getByRole("button", { name: "Actions" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "View" })).toBeNull();
  });

  it("builds a Markdown document with title, date, source names and body — and no raw ids", () => {
    const markdown = expectedMarkdown(HEALTHY);

    expect(markdown).toContain(`# ${NOTE_TITLE}`);
    expect(markdown).toContain(formatDateTime(GENERATED_AT, "en"));
    expect(markdown).toContain("2026");
    expect(markdown).toContain("hücre-notu.pdf");
    expect(markdown).toContain("organeller.pdf");
    expect(markdown).toContain(SUMMARY);
    expect(markdown).toContain("- hücre zarı");
    expect(markdown).toContain("18");
    expect(markdown).not.toContain("file-aaa1");
    expect(markdown).not.toContain("doc-ccc3");
    expect(markdown).not.toContain("course_note");
  });

  it("copies exactly the built Markdown and confirms it visibly", async () => {
    renderDrawer(HEALTHY);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(expectedMarkdown(HEALTHY));
    await waitFor(() => expect(screen.getByText("Copied to the clipboard")).toBeTruthy());
  });

  it("downloads the Markdown under a dated .md file name", async () => {
    renderDrawer(HEALTHY);

    fireEvent.click(screen.getByRole("button", { name: "Download (.md)" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    await expect(blob.text()).resolves.toBe(expectedMarkdown(HEALTHY));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("renders an honest sentence for a degraded output instead of a blank drawer", async () => {
    const degraded: RagOutput = {
      ...HEALTHY,
      sources: ["file-zzz9"],
      payload: { course_note: "note-1", files: [], failed: ["bozuk.pdf"], summary: "" },
    };
    renderDrawer(degraded);

    await waitFor(() => expect(screen.getByText("Some attachments could not be processed")).toBeTruthy());
    expect(screen.getByText("Not processed: bozuk.pdf")).toBeTruthy();
    expect(screen.getByText("This output has no readable text. The raw record is below.")).toBeTruthy();
    // The stored attachment id has no name to show, so it never leaks raw.
    expect(screen.getByText("Unnamed attachment")).toBeTruthy();
    expect(screen.queryByText(/file-zzz9/)).toBeNull();
  });

  it("shows the extracted passages with their source files, page ranges and line breaks", async () => {
    renderDrawer(WITH_PASSAGES);

    await waitFor(() => expect(screen.getByText("Extracted text")).toBeTruthy());
    expect(screen.getByText("hücre-notu.pdf · pp. 3-4")).toBeTruthy();
    expect(screen.getByText("organeller.pdf · p. 5")).toBeTruthy();
    // The section renders the passages — it does not dump their ids.
    const section = passagesSection();
    const first = within(section).getByText(/Hücre zarı seçici geçirgendir/);
    expect(first.textContent).toBe(PASSAGE_TEXT_1);
    expect(first.className).toContain("whitespace-pre-wrap");
    expect(within(section).getByText(/Mitokondri, oksijenli solunumla/)).toBeTruthy();
    expect(within(section).queryByText(/chunk-/)).toBeNull();
    expect(within(section).queryByText(/doc-/)).toBeNull();
  });

  it("exports the same passages, in the same order, into the Markdown document", () => {
    const markdown = expectedMarkdown(WITH_PASSAGES);

    expect(markdown).toContain("## Extracted text");
    expect(markdown).toContain("**hücre-notu.pdf · pp. 3-4**");
    expect(markdown).toContain("**organeller.pdf · p. 5**");
    const first = markdown.indexOf(PASSAGE_TEXT_1);
    const second = markdown.indexOf(PASSAGE_TEXT_2);
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(markdown.indexOf("## Extracted text")).toBeLessThan(markdown.indexOf("## Other fields"));
    expect(markdown).not.toContain("chunk-1");
    expect(markdown).not.toContain("doc-ccc3");
    expect(markdown).not.toContain("passages_truncated");
  });

  it("copies the passages exactly as exported, truncation note included", async () => {
    renderDrawer(WITH_TRUNCATED);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(expectedMarkdown(WITH_TRUNCATED));
  });

  it("renders no extracted-text section for outputs stored before passages existed", async () => {
    renderDrawer(HEALTHY);

    await waitFor(() => expect(screen.getByText(SUMMARY)).toBeTruthy());
    expect(screen.queryByText("Extracted text")).toBeNull();
  });

  it("survives an ill-typed passages value without rendering a section", async () => {
    renderDrawer(withPassages({ passages: "bozuk" }));

    await waitFor(() => expect(screen.getByText(SUMMARY)).toBeTruthy());
    expect(screen.queryByText("Extracted text")).toBeNull();
  });

  it("says honestly how many passages were extracted when the list is capped", async () => {
    renderDrawer(WITH_TRUNCATED);

    await waitFor(() => expect(screen.getByText("Extracted text")).toBeTruthy());
    expect(
      screen.getByText(ragOutputMessage("en", "passagesTruncated", { shown: 2, total: 18 })),
    ).toBeTruthy();
  });

  it("renders the Turkish section title and truncation sentence", async () => {
    localStorage.setItem("hezarfen.locale", "tr");
    renderDrawer(WITH_TRUNCATED);

    await waitFor(() => expect(screen.getByText("Çıkarılan metin")).toBeTruthy());
    expect(
      screen.getByText(ragOutputMessage("tr", "passagesTruncated", { shown: 2, total: 18 })),
    ).toBeTruthy();
  });

  it("never shows a raw attachment id for a passage whose source cannot be resolved", async () => {
    renderDrawer(
      withPassages({
        passages: [
          { chunk_id: "chunk-9", doc_id: "doc-zzz9", text: PASSAGE_TEXT_2, page_start: null, page_end: null },
        ],
      }),
    );

    await waitFor(() => expect(screen.getByText("Extracted text")).toBeTruthy());
    expect(screen.getByText("Unnamed attachment")).toBeTruthy();
    const section = passagesSection();
    expect(within(section).getByText(/Mitokondri, oksijenli solunumla/)).toBeTruthy();
    expect(within(section).queryByText(/doc-zzz9/)).toBeNull();
    expect(within(section).queryByText(/chunk-9/)).toBeNull();
  });

  it("labels a note-body passage with the note title, never the note key", async () => {
    renderDrawer(WITH_NOTE_PASSAGE);

    await waitFor(() => expect(screen.getByText("Extracted text")).toBeTruthy());
    const section = passagesSection();
    expect(within(section).getByText(NOTE_TITLE)).toBeTruthy();
    expect(within(section).queryByText(/note-1/)).toBeNull();

    // The export carries the same label the view shows.
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(expectedMarkdown(WITH_NOTE_PASSAGE));
  });
});
