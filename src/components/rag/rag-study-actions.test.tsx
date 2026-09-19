import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "@/api/client";
import { ragCopy } from "@/components/rag/rag-copy";
import { RagStudyActions } from "@/components/rag/rag-study-actions";
import { PreferencesProvider } from "@/stores/preferences-context";

const { postRagSummarize, postRagQuestions } = vi.hoisted(() => ({
  postRagSummarize: vi.fn(),
  postRagQuestions: vi.fn(),
}));
vi.mock("@/api/rag", () => ({ postRagSummarize, postRagQuestions }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const scope = { ders: "Biyoloji", span_ids: ["s1"], pages: [1], scope_label: "Hücre" };

function mount(unavailable = false, onUnavailable = vi.fn()) {
  render(() => (
    <PreferencesProvider>
      <RagStudyActions scope={scope} copy={ragCopy("en")} unavailable={unavailable} onUnavailable={onUnavailable} />
    </PreferencesProvider>
  ));
  return onUnavailable;
}

test("summarize sends exactly the cited range and shows the summary", async () => {
  postRagSummarize.mockResolvedValue({ text: "Cells share metabolism.", abstained: false, reason: "", citations: [], scope_pages: [1], hierarchical: false });
  mount();

  fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

  expect(await screen.findByText("Cells share metabolism.")).toBeTruthy();
  expect(postRagSummarize).toHaveBeenCalledWith(scope);
  expect(screen.getByText("Pages covered: 1")).toBeTruthy();
});

test("practice questions carry the chosen difficulty and keep answers folded", async () => {
  postRagQuestions.mockResolvedValue({ items: [{ question: "What do all cells do?", answer: "Metabolize.", difficulty: "zor" }], abstained: false, reason: "", span_ids: ["s1"], pages: [1] });
  mount();

  // The app Select keeps a hidden native <select> as its value carrier.
  fireEvent.change(document.querySelector("select")!, { target: { value: "zor" } });
  fireEvent.click(screen.getByRole("button", { name: "Practice questions" }));

  expect(await screen.findByText("What do all cells do?")).toBeTruthy();
  expect(postRagQuestions).toHaveBeenCalledWith({ ...scope, n: 5, difficulty: "zor" });
  expect(screen.getByText("Show answer")).toBeTruthy();
});

test("a 503 tells the board the study service is down instead of showing an error", async () => {
  postRagSummarize.mockRejectedValue(new ApiError(503, "no AI service is connected right now"));
  const onUnavailable = mount();

  fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

  await waitFor(() => expect(onUnavailable).toHaveBeenCalledOnce());
  expect(screen.queryByRole("alert")).toBeNull();
});

test("when the service is down the buttons stand down with a plain note", () => {
  mount(true);
  expect(screen.queryByRole("button", { name: "Summarize" })).toBeNull();
  expect(screen.getByText(/not available right now/)).toBeTruthy();
});
