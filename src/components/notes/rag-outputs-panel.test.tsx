import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RagOutputsPanel } from "@/components/notes/rag-outputs-panel";
import type { NoteFileSource } from "@/lib/note-source";
import { PreferencesProvider } from "@/stores/preferences-context";

const aiApi = vi.hoisted(() => ({ getAiCapabilities: vi.fn() }));
// The panel reports success through a toast; capture the text without a portal.
const toastApi = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("@/api/ai", () => aiApi);
vi.mock("@/components/ui/toast", () => ({ showToast: toastApi.showToast, Toaster: () => null }));

const CAPABILITIES_WITH_RAG = {
  enabled: true,
  protocol: "hab/2",
  capabilities: [{ capability: "rag.index", workers: 1, inflight: 0 }],
};

/** A source whose list stays empty — the state a refused reindex leaves behind. */
function stubSource(options: { rag?: boolean } = {}): NoteFileSource {
  return {
    maxFiles: 10,
    listFiles: async () => ({ items: [], total: 0, limit: 10, offset: 0 }),
    uploadFile: async () => {
      throw new Error("not used by this panel");
    },
    deleteFile: async () => {},
    fileUrl: () => "",
    fileBlob: async () => new Blob(),
    listRagOutputs: async () => ({ items: [], total: 0, limit: 10, offset: 0 }),
    deleteRagOutput: async () => {},
    reindexRag: async () => {
      if (!options.rag) throw new Error("reindex should not be called without rag.index");
    },
  };
}

function renderPanel(source: NoteFileSource) {
  render(() => (
    <PreferencesProvider>
      <RagOutputsPanel noteId="note-1" active source={source} />
    </PreferencesProvider>
  ));
}

const generateButton = () => screen.getByRole("button", { name: "Create summary" }) as HTMLButtonElement;

describe("RagOutputsPanel", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("reports that nothing was indexed when the poll ends without an output", async () => {
    vi.useFakeTimers();
    aiApi.getAiCapabilities.mockResolvedValue(CAPABILITIES_WITH_RAG);

    renderPanel(stubSource({ rag: true }));
    fireEvent.click(generateButton());

    // 24 polls after the initial 1.5s delay is the panel's own ceiling.
    for (let i = 0; i < 24; i += 1) await vi.advanceTimersByTimeAsync(2500);

    // The truthful message is on screen, twice: the notice and the empty list.
    expect(
      screen.getByText("The summary was not created. Nothing is indexed for this note yet — press Create summary to try again."),
    ).toBeTruthy();
    expect(screen.getByText("Nothing is indexed for this note yet. Press Create summary to try again.")).toBeTruthy();
    // The false claim must be gone: nothing is running in the background.
    expect(toastApi.showToast).not.toHaveBeenCalledWith({ title: "Summary generation continues in the background." });
    // The button can be pressed again.
    expect(generateButton().disabled).toBe(false);
  });

  it("disables the button and names the reason when no worker serves rag.index", async () => {
    aiApi.getAiCapabilities.mockResolvedValue({
      enabled: true,
      protocol: "hab/2",
      capabilities: [{ capability: "chat.reply", workers: 1, inflight: 0 }],
    });

    renderPanel(stubSource());

    await waitFor(() => {
      expect(
        screen.getByText("The AI summary service is not connected right now. Try again when a worker is available."),
      ).toBeTruthy();
    });
    expect(generateButton().disabled).toBe(true);
  });

  it("keeps the button live when rag.index is advertised", async () => {
    aiApi.getAiCapabilities.mockResolvedValue(CAPABILITIES_WITH_RAG);

    renderPanel(stubSource({ rag: true }));

    await waitFor(() => {
      expect(generateButton().disabled).toBe(false);
    });
    expect(
      screen.queryByText("The AI summary service is not connected right now. Try again when a worker is available."),
    ).toBeNull();
  });
});
