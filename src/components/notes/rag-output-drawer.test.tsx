import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RagOutput } from "@/api/client";
import { RagOutputDrawer } from "@/components/notes/rag-output-drawer";
import { buildRagOutputMarkdown, readRagOutputDocument } from "@/components/notes/rag-output-document";
import { ragOutputMessage } from "@/components/notes/rag-output-messages";
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

const LABELS = {
  date: ragOutputMessage("en", "date"),
  note: ragOutputMessage("en", "note"),
  sources: ragOutputMessage("en", "sources"),
  failed: ragOutputMessage("en", "failedTitle"),
  otherFields: ragOutputMessage("en", "otherFields"),
};

function expectedMarkdown(output: RagOutput) {
  return buildRagOutputMarkdown({
    title: NOTE_TITLE,
    date: formatDateTime(output.generated_at, "en"),
    noteTitle: NOTE_TITLE,
    document: readRagOutputDocument(output),
    labels: LABELS,
  });
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
    vi.clearAllMocks();
  });

  it("opens the drawer from the card body and shows the stored output", async () => {
    renderPanel(HEALTHY);
    await waitFor(() => expect(screen.getByText(SUMMARY)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    await waitFor(() => expect(screen.getByText("Source attachments")).toBeTruthy());
    // Attachments by name, and the prose — now on screen twice: card and drawer.
    expect(screen.getByText("hücre-notu.pdf")).toBeTruthy();
    expect(screen.getByText("organeller.pdf")).toBeTruthy();
    expect(screen.getAllByText(SUMMARY).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(NOTE_TITLE).length).toBeGreaterThanOrEqual(1);
    // Every payload field stays reachable: the lesser ones in the open, the raw
    // object behind the disclosure.
    expect(screen.getByText("Text chunks")).toBeTruthy();
    expect(screen.getByText("18")).toBeTruthy();
    expect(screen.getByText("Technical details")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download (.md)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Print / PDF" })).toBeTruthy();
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
});
