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
  InsightStudentsTable: (props: { onNeedMore: () => void }) => (
    <button type="button" onClick={props.onNeedMore}>Load next rows</button>
  ),
}));

afterEach(() => {
  cleanup();
  clearStudentSignalCache("insights-board-viewer");
  vi.clearAllMocks();
});

it("reads only the first 50 student insights until more rows are requested", async () => {
  api.getMyStudents.mockResolvedValue({ items: Array.from({ length: 200 }, (_, index) => ({
    id: `student-${index}`, username: `student-${index}`, display_name: `Student ${index}`,
  })) });
  api.getInsightByUserId.mockImplementation(async (id: string) => ({
    user_id: id, summary: null, attention: [], cards: [], segments: [],
  }));
  render(() => <InsightsBoard />);
  await waitFor(() => expect(api.getInsightByUserId).toHaveBeenCalledTimes(50));
  fireEvent.click(screen.getByRole("button", { name: "Load next rows" }));
  await waitFor(() => expect(api.getInsightByUserId).toHaveBeenCalledTimes(100));
});
