import { createEffect } from "solid-js";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";
import { InsightsBoard } from "./insights-board";
import { clearStudentSignalCache } from "@/lib/insight-students";

const api = vi.hoisted(() => ({
  getMyStudents: vi.fn(),
  getInsightByUserId: vi.fn(),
}));

vi.mock("@/api/parents", () => ({ getMyStudents: api.getMyStudents }));
vi.mock("@/api/insights", () => ({
  getInsightByUserId: api.getInsightByUserId,
  getMyInsight: vi.fn(),
  getInsightRuns: vi.fn(),
  postInsightsRefresh: vi.fn(),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "insights-board-viewer", role: "parent" }) }),
}));
vi.mock("@/stores/preferences-context", () => ({
  usePreferences: () => ({ t: (key: string) => key, locale: () => "en" }),
}));
vi.mock("@/components/ui/data-table", () => ({ DataTableSkeleton: () => null }));
vi.mock("@/components/insights/insight-overview", () => ({ InsightOverview: () => null }));
vi.mock("@/components/insights/insight-students-table", () => ({
  InsightStudentsTable: (props: { rows: { id: string }[]; onPageRowsChange: (rows: { id: string }[]) => void; onInspectAll: () => void }) => {
    createEffect(() => props.onPageRowsChange(props.rows.slice(0, 10)));
    return (
      <div>
        <button type="button" onClick={() => props.onPageRowsChange(props.rows.slice(10, 20))}>Next page</button>
        <button type="button" onClick={props.onInspectAll}>Filter by signal</button>
      </div>
    );
  },
}));

afterEach(() => {
  cleanup();
  clearStudentSignalCache("insights-board-viewer");
  vi.clearAllMocks();
});

it("reads only the displayed page, then new pages or a signal filter", async () => {
  api.getMyStudents.mockResolvedValue({ items: Array.from({ length: 200 }, (_, index) => ({
    id: `student-${index}`, username: `student-${index}`, display_name: `Student ${index}`,
  })) });
  api.getInsightByUserId.mockImplementation(async (id: string) => ({
    user_id: id, summary: null, attention: [], cards: [], segments: [],
  }));
  render(() => <InsightsBoard />);
  await waitFor(() => expect(api.getInsightByUserId).toHaveBeenCalledTimes(10));
  expect(api.getInsightByUserId).toHaveBeenCalledTimes(10);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(api.getInsightByUserId).toHaveBeenCalledTimes(20));
  fireEvent.click(screen.getByRole("button", { name: "Filter by signal" }));
  await waitFor(() => expect(api.getInsightByUserId).toHaveBeenCalledTimes(200));
});
