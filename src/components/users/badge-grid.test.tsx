import { render, screen } from "@solidjs/testing-library";
import type { BadgeCatalogEntry, ProfileStats } from "@/api/client";
import { BadgeGrid } from "@/components/users/badge-grid";
import { PreferencesProvider } from "@/stores/preferences-context";

const catalog: BadgeCatalogEntry[] = [
  { id: "homework_submitted_1", stat: "homework_submitted", threshold: 1 },
  { id: "homework_submitted_10", stat: "homework_submitted", threshold: 10 },
  { id: "study_streak_7", stat: "study_streak", threshold: 7 },
  // An id this build has no copy for — it must render, not crash.
  { id: "streak_1000", stat: "streak_days", threshold: 1000 },
];

const stats: ProfileStats = {
  pomodoro_sessions: 0,
  pomodoro_focus_ms: 0,
  courses: 0,
  classes: 0,
  homework_submitted_total: 7,
  homework_on_time_total: 0,
  exam_sat_total: 0,
  pomodoro_finished_total: 0,
  pomodoro_focus_ms_total: 0,
  marks_given_total: 0,
  lessons_held_total: 0,
  pool_approved_total: 0,
  pool_published_total: 0,
  lessons_attended_total: 0,
  high_mark_total: 0,
  study_streak_total: 7,
};

function renderGrid(earned: { id: string; earned_at: number }[]) {
  return render(() => (
    <PreferencesProvider>
      <BadgeGrid catalog={catalog} earned={earned} stats={stats} />
    </PreferencesProvider>
  ));
}

afterEach(() => vi.restoreAllMocks());

test("shows the whole catalogue, earned and locked alike", () => {
  renderGrid([{ id: "homework_submitted_1", earned_at: 1_700_000_000_000 }]);
  expect(screen.getAllByRole("generic", { hidden: true }).length).toBeGreaterThan(0);
  // Both the earned and the unearned tier are present — the incomplete grid is
  // the point, so an unearned badge is never hidden.
  expect(screen.getByText("First Steps")).toBeTruthy();
  expect(screen.getByText("Steady Hand")).toBeTruthy();
});

test("an unearned badge shows its progress inline, an earned one shows its date", () => {
  renderGrid([{ id: "homework_submitted_1", earned_at: 1_700_000_000_000 }]);
  // The tooltip is hover-only, so the tile itself must carry the numbers:
  // 7 of 10 done on the second tier.
  expect(screen.getAllByText("7 / 10").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Earned/).length).toBeGreaterThan(0);
  // The remaining count rides the accessible name, which is what the tooltip
  // repeats — a keyboard or screen-reader user gets it without hovering.
  expect(screen.getByLabelText(/Steady Hand — 3 to go/)).toBeTruthy();
  expect(screen.getByLabelText(/Study Week — 0 to go/)).toBeTruthy();
});

test("a badge whose stat this build does not know shows no progress bar", () => {
  renderGrid([]);
  // Falls back to the raw id for the label and to the generic locked line.
  expect(screen.getByText("streak_1000")).toBeTruthy();
  expect(screen.getAllByText("Not earned yet").length).toBe(1);
});

test("every tile is focusable and labelled, so the tooltip is reachable by keyboard", () => {
  renderGrid([]);
  const tiles = screen.getAllByLabelText(/—/);
  expect(tiles.length).toBe(catalog.length);
  for (const tile of tiles) expect(tile.getAttribute("tabindex")).toBe("0");
});
