import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RagMessage } from "@/api/client";
import { RagMessageRow } from "@/components/rag/rag-message-row";
import { ragCopy } from "@/components/rag/rag-copy";

const labels = ragCopy("tr");

function message(over: Partial<RagMessage>): RagMessage {
  return {
    id: "m1",
    thread_id: "t1",
    role: "assistant",
    status: "complete",
    content: "Hücre zarı seçici geçirgendir.",
    abstained: false,
    reason: "",
    citations: [],
    created_at: Date.UTC(2026, 0, 2),
    ...over,
  };
}

describe("RagMessageRow", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("copies a finished answer and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(() => <RagMessageRow message={message({})} labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: labels.copy }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Hücre zarı seçici geçirgendir."));
    await waitFor(() => expect(screen.getByText(labels.copied)).toBeTruthy());
  });

  it("offers no copy on the user's own turn", () => {
    render(() => <RagMessageRow message={message({ role: "user" })} labels={labels} />);

    expect(screen.queryByRole("button", { name: labels.copy })).toBeNull();
  });

  it("re-asks through the handler the panel supplies", () => {
    const onRetry = vi.fn();
    render(() => <RagMessageRow message={message({ status: "failed" })} labels={labels} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: labels.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows no action row while the answer is still pending", () => {
    render(() => <RagMessageRow message={message({ status: "pending", content: "" })} labels={labels} onRetry={vi.fn()} />);

    expect(screen.queryByRole("button", { name: labels.retry })).toBeNull();
    expect(screen.queryByRole("button", { name: labels.copy })).toBeNull();
  });
});
