import { createRoot } from "solid-js";
import { createDebouncedSignal } from "./create-debounced-signal";

describe("createDebouncedSignal", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("updates raw at once and the debounced copy only after the delay", () => {
    createRoot((dispose) => {
      const [raw, set, debounced] = createDebouncedSignal("", 300);
      set("ne");
      expect(raw()).toBe("ne");
      expect(debounced()).toBe("");
      vi.advanceTimersByTime(299);
      expect(debounced()).toBe("");
      vi.advanceTimersByTime(1);
      expect(debounced()).toBe("ne");
      dispose();
    });
  });

  it("keeps only the last keystroke when typing faster than the delay", () => {
    createRoot((dispose) => {
      const values: string[] = [];
      const [, set, debounced] = createDebouncedSignal("", 300);
      set("n");
      vi.advanceTimersByTime(100);
      set("ne");
      vi.advanceTimersByTime(100);
      set("newton");
      vi.advanceTimersByTime(300);
      values.push(debounced());
      expect(values).toEqual(["newton"]);
      dispose();
    });
  });

  it("cancels a pending update when the owner disposes", () => {
    let read = () => "";
    createRoot((dispose) => {
      const [, set, debounced] = createDebouncedSignal("", 300);
      read = debounced;
      set("newton");
      dispose();
    });
    vi.advanceTimersByTime(500);
    expect(read()).toBe("");
  });
});
