import { createRoot } from "solid-js";
import { createLivePoll } from "./create-live-poll";

// vitest runs in the node environment (no jsdom). node ships global EventTarget
// and Event, so we back document/window with real EventTargets plus a settable
// `hidden` getter — enough surface for the helper (addEventListener,
// removeEventListener, dispatchEvent, document.hidden).
let hidden = false;
let doc: EventTarget & { hidden: boolean };
let win: EventTarget;
const setHidden = (v: boolean) => {
  hidden = v;
};
const savedDoc = globalThis.document;
const savedWin = globalThis.window;

describe("createLivePoll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    doc = new EventTarget() as EventTarget & { hidden: boolean };
    Object.defineProperty(doc, "hidden", { get: () => hidden });
    win = new EventTarget();
    (globalThis as { document: unknown }).document = doc;
    (globalThis as { window: unknown }).window = win;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    (globalThis as { document: unknown }).document = savedDoc;
    (globalThis as { window: unknown }).window = savedWin;
  });

  it("polls on the interval while visible", () => {
    const refetch = vi.fn();
    createRoot((dispose) => {
      createLivePoll(refetch, 1000);
      expect(refetch).not.toHaveBeenCalled(); // no immediate call — resource already loaded
      vi.advanceTimersByTime(3000);
      expect(refetch).toHaveBeenCalledTimes(3);
      dispose();
    });
  });

  it("does not start the interval when the tab is hidden on mount", () => {
    setHidden(true);
    const refetch = vi.fn();
    createRoot((dispose) => {
      createLivePoll(refetch, 1000);
      vi.advanceTimersByTime(5000);
      expect(refetch).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("refetches once on tab-back and resumes polling", () => {
    const refetch = vi.fn();
    createRoot((dispose) => {
      createLivePoll(refetch, 1000);
      setHidden(true);
      doc.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(5000);
      expect(refetch).toHaveBeenCalledTimes(0); // no polls while hidden
      setHidden(false);
      doc.dispatchEvent(new Event("visibilitychange"));
      expect(refetch).toHaveBeenCalledTimes(1); // immediate catch-up
      vi.advanceTimersByTime(2000);
      expect(refetch).toHaveBeenCalledTimes(3); // polling resumed
      dispose();
    });
  });

  it("collapses a visibilitychange+focus double-fire into one refetch", () => {
    const refetch = vi.fn();
    createRoot((dispose) => {
      createLivePoll(refetch, 10_000);
      setHidden(true);
      doc.dispatchEvent(new Event("visibilitychange"));
      setHidden(false);
      doc.dispatchEvent(new Event("visibilitychange"));
      win.dispatchEvent(new Event("focus"));
      expect(refetch).toHaveBeenCalledTimes(1); // 1s guard swallows the second wake
      dispose();
    });
  });

  it("stops polling after dispose", () => {
    const refetch = vi.fn();
    createRoot((dispose) => {
      createLivePoll(refetch, 1000);
      dispose();
    });
    vi.advanceTimersByTime(5000);
    expect(refetch).not.toHaveBeenCalled();
  });
});
