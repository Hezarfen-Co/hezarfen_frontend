import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";
import { InsightOverview } from "./insight-overview";

vi.mock("@/stores/preferences-context", () => ({
  usePreferences: () => ({
    locale: () => "en",
    t: (key: string, vars?: Record<string, number>) => key === "insights.overview.reading"
      ? `Reading ${vars?.loaded} of ${vars?.total} students…`
      : key,
  }),
}));

afterEach(cleanup);

it("labels partial counts and averages with their current coverage", () => {
  render(() => <InsightOverview overview={{
    total: 200, loaded: 50, analysed: 40, needAttention: 7,
    marksAverage: 78, attendanceRate: 0.9,
  }} />);
  expect(screen.getByText("40 / 200")).toBeTruthy();
  expect(screen.getByText("7 / 50")).toBeTruthy();
  expect(screen.getAllByText("Reading 50 of 200 students…").length).toBeGreaterThan(0);
});
