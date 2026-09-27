import type { PersonRef, StudentInsight } from "@/api/client";
import { cachedStudentSignal, clearStudentSignalCache, insightOverview, loadStudentSignals } from "./insight-students";
import { toStudentSignal } from "./insight-run-report";

const person = (id: string): PersonRef => ({ id, username: id, display_name: id.toUpperCase() });
const insight = (id: string, average: number, rate: number, attention: number): StudentInsight => ({
  user_id: id,
  summary: {
    confidence: "high",
    computed_at: 1,
    marks: { courses: { c1: { n_marks: 2, average } } },
    attendance: { overall: { rate, n_obs: 10 } },
  } as never,
  attention: Array.from({ length: attention }, () => ({}) as never),
  cards: [],
  segments: [],
});

it("reads every student, turning a failed read into that row's error", async () => {
  const rows: string[] = [];
  await loadStudentSignals([person("a"), person("b")], (row) => rows.push(`${row.id}:${row.state}`), async (id) => {
    if (id === "b") throw new Error("boom");
    return insight(id, 80, 0.9, 0);
  });
  expect(rows.sort()).toEqual(["a:ok", "b:error"]);
});

it("summarises only what the summaries measured", () => {
  const signals = [
    toStudentSignal({ id: "a", name: "A" }, insight("a", 80, 0.9, 2), null),
    toStudentSignal({ id: "b", name: "B" }, insight("b", 60, 0.7, 0), null),
    toStudentSignal({ id: "c", name: "C" }, { user_id: "c", summary: null, attention: [], cards: [], segments: [] }, null),
    toStudentSignal({ id: "d", name: "D" }, null, null),
  ];
  expect(insightOverview(signals, 5)).toEqual({
    total: 5,
    loaded: 3,
    analysed: 2,
    needAttention: 1,
    marksAverage: 70,
    attendanceRate: 0.8,
  });
});

it("reuses successful reads within a viewer tab and keeps viewers separate", async () => {
  const read = vi.fn(async (id: string) => insight(id, 80, 0.9, 0));
  const rows: string[] = [];
  await loadStudentSignals([person("a")], (row) => rows.push(row.state), read, "viewer-a");
  expect(cachedStudentSignal(person("a"), "viewer-a")?.state).toBe("ok");
  await loadStudentSignals([person("a")], (row) => rows.push(row.state), read, "viewer-a");
  expect(read).toHaveBeenCalledTimes(1);
  expect(cachedStudentSignal(person("a"), "viewer-b")).toBeNull();
  await loadStudentSignals([person("a")], () => {}, read, "viewer-b");
  expect(read).toHaveBeenCalledTimes(2);
  expect(rows).toEqual(["ok", "ok"]);
  clearStudentSignalCache("viewer-a");
  clearStudentSignalCache("viewer-b");
});

it("limits concurrent reads in a requested row window", async () => {
  let active = 0;
  let peak = 0;
  const pending: Array<() => void> = [];
  const read = vi.fn((id: string) => new Promise<StudentInsight>((resolve) => {
    active++;
    peak = Math.max(peak, active);
    pending.push(() => { active--; resolve(insight(id, 80, 0.9, 0)); });
  }));
  const done = loadStudentSignals(Array.from({ length: 12 }, (_, index) => person(String(index))), () => {}, read);
  expect(read).toHaveBeenCalledTimes(6);
  while (pending.length) {
    pending.shift()!();
    await Promise.resolve();
  }
  await done;
  expect(read).toHaveBeenCalledTimes(12);
  expect(peak).toBe(6);
});

it("does not cache a failed read", async () => {
  const read = vi.fn()
    .mockRejectedValueOnce(new Error("temporary"))
    .mockResolvedValueOnce(insight("retry", 80, 0.9, 0));
  const states: string[] = [];
  await loadStudentSignals([person("retry")], (row) => states.push(row.state), read, "retry-viewer");
  await loadStudentSignals([person("retry")], (row) => states.push(row.state), read, "retry-viewer");
  expect(states).toEqual(["error", "ok"]);
  expect(read).toHaveBeenCalledTimes(2);
  clearStudentSignalCache("retry-viewer");
});
