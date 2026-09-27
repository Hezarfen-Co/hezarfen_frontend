import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";
import { InsightStudentsTable } from "./insight-students-table";
import { toStudentSignal } from "@/lib/insight-run-report";

vi.mock("@tanstack/solid-router", () => ({ useNavigate: () => vi.fn(), Link: () => null }));
vi.mock("@/stores/preferences-context", () => ({
  usePreferences: () => ({ locale: () => "en", t: (key: string) => key }),
}));
vi.mock("@/components/ui/data-table", () => ({
  DataTable: (props: { filters: unknown; onPageRowsChange?: (rows: unknown[]) => void; data: unknown[] }) => (
    <div>
      <table><thead><tr><th><button type="button">Sort</button></th></tr></thead></table>
      <button type="button" onClick={() => props.onPageRowsChange?.(props.data)}>Page rows</button>
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

it("forwards page rows and loads all for a signal filter or sort", () => {
  const page = vi.fn();
  const all = vi.fn();
  render(() => <InsightStudentsTable
    rows={[toStudentSignal({ id: "a", name: "A" }, null, null)]}
    title="Students"
    description=""
    empty=""
    onPageRowsChange={page}
    onInspectAll={all}
  />);
  fireEvent.click(screen.getByRole("button", { name: "Page rows" }));
  expect(page).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Sort" }));
  fireEvent.click(screen.getByRole("button", { name: "Attention filter" }));
  expect(all).toHaveBeenCalledTimes(2);
});
