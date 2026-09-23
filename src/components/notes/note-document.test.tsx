import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteDocument, stageFiles, uploadStagedFiles } from "@/components/notes/note-document";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getSettings, navigate, postNote, postNoteFile, showToast } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  navigate: vi.fn(),
  postNote: vi.fn(),
  postNoteFile: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element }) => <a href={props.to}>{props.children}</a>,
  useBlocker: () => () => ({ status: "unblocked" }),
  useNavigate: () => navigate,
}));
vi.mock("@/api/settings", () => ({ getSettings }));
vi.mock("@/api/notes", () => ({
  deleteNoteById: vi.fn(),
  deleteNoteFileById: vi.fn(),
  getNoteFileBlob: vi.fn(),
  getNoteFileUrl: vi.fn(),
  getNoteFiles: vi.fn(),
  patchNoteById: vi.fn(),
  postNote,
  postNoteFile,
}));
vi.mock("@/components/notes/note-files-panel", () => ({ NoteFilesPanel: () => null }));
vi.mock("@/components/notes/note-rich-editor", () => ({
  NoteRichEditor: (props: { actions?: JSX.Element; onChange: (value: string) => void }) => (
    <div>
      {props.actions}
      <textarea aria-label="note body" onInput={(event) => props.onChange(event.currentTarget.value)} />
    </div>
  ),
}));
vi.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));
vi.mock("@/components/ui/toast", () => ({ showToast }));

const file = (name: string, size: number) => new File([new Uint8Array(size)], name, { type: "text/plain" });

describe("NoteDocument staged attachments", () => {
  beforeEach(() => {
    getSettings.mockResolvedValue({ max_file_bytes: 10 });
    navigate.mockResolvedValue(undefined);
    postNote.mockResolvedValue({ id: "note-1", title: "Study", content: "" });
    postNoteFile.mockResolvedValue({ id: "file-1" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps valid files, rejects oversized files, and stops at the count limit", () => {
    const result = stageFiles([file("existing.txt", 1)], [file("ok.txt", 2), file("large.txt", 11), file("extra.txt", 2)], 2, 10);

    expect(result.files.map((item) => item.name)).toEqual(["existing.txt", "ok.txt"]);
    expect(result.tooLarge).toBe(true);
    expect(result.atLimit).toBe(true);
  });

  it("shows staged files and lets the user remove one before saving", async () => {
    const { container } = render(() => (
      <PreferencesProvider>
        <NoteDocument />
      </PreferencesProvider>
    ));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("study.txt", 3), file("plan.txt", 4)] } });

    expect(screen.getByText("study.txt")).toBeTruthy();
    expect(screen.getByText("3 B")).toBeTruthy();
    expect(screen.getByText(/staged files will upload|dosyalar notu kaydettiğinde/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Remove file: study.txt|Dosyayı kaldır: study.txt/ }));
    expect(screen.queryByText("study.txt")).toBeNull();
    expect(screen.getByText("plan.txt")).toBeTruthy();
  });

  it("creates the note before uploading staged files, sequentially", async () => {
    const calls: string[] = [];
    postNote.mockImplementation(async () => {
      calls.push("create");
      return { id: "note-1", title: "Study", content: "" };
    });
    postNoteFile.mockImplementation(async (_noteId: string, item: File) => {
      calls.push(item.name);
      if (item.name === "failed.txt") throw new Error("upload failed");
      return { id: item.name };
    });

    const { container } = render(() => (
      <PreferencesProvider>
        <NoteDocument />
      </PreferencesProvider>
    ));
    fireEvent.input(screen.getByLabelText(/Title|Başlık/), { target: { value: "Study" } });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file("first.txt", 2), file("failed.txt", 2), file("last.txt", 2)] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save|Kaydet/ }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(calls).toEqual(["create", "first.txt", "failed.txt", "last.txt"]);
    expect(navigate).toHaveBeenCalledWith({ to: "/notes/$id", params: { id: "note-1" }, replace: true });
    expect(showToast).toHaveBeenCalledWith({ title: expect.stringContaining("failed.txt") });
  });

  it("reports upload failures by name while continuing in order", async () => {
    const calls: string[] = [];
    const failed = await uploadStagedFiles("note-1", [file("one.txt", 1), file("two.txt", 1)], async (_id, item) => {
      calls.push(item.name);
      if (item.name === "one.txt") throw new Error("failed");
      return { id: "file-2" };
    });

    expect(calls).toEqual(["one.txt", "two.txt"]);
    expect(failed).toEqual(["one.txt"]);
  });
});
