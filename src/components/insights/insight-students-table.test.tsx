import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";
import { InsightStudentsTable } from "./insight-students-table";
import { toStudentSignal } from "@/lib/insight-run-report";

vi.mock("@tanstack/solid-router", () => ({ useNavigate: () => vi.fn(), Link: () => null }));
vi.mock("@/stores/preferences-context", () => ({
  usePreferences: () => ({ locale: () => "en", t: (key: string) => key }),
}));
vi.mock("@/components/ui/data-table", () => ({
  DataTable: (props: { filters: unknown }) => (
    <div>
      <table><thead><tr><th><button type="button">Sort</button></th></tr></thead></table>
      {props.filters as never}
    </div>
  ),
}));
vi.mock("@/components/ui/select", () => ({
  DropdownSelect: (props: { onChange: (value: "attention") => void }) => (
    <button type="button" onClick={() => props.onChange("attention")}>Attention filter</button>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("requests more only near the table end, and loads all for a signal filter or sort", () => {
  let notify: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof notify) { notify = callback; }
    observe() {}
    disconnect() {}
  });
  const more = vi.fn();
  const all = vi.fn();
  render(() => <InsightStudentsTable
    rows={[toStudentSignal({ id: "a", name: "A" }, null, null)]}
    title="Students"
    description=""
    empty=""
    hasMore
    onNeedMore={more}
    onInspectAll={all}
  />);
  expect(more).not.toHaveBeenCalled();
  notify?.([{ isIntersecting: false }]);
  expect(more).not.toHaveBeenCalled();
  notify?.([{ isIntersecting: true }]);
  expect(more).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Sort" }));
  fireEvent.click(screen.getByRole("button", { name: "Attention filter" }));
  expect(all).toHaveBeenCalledTimes(2);
});
