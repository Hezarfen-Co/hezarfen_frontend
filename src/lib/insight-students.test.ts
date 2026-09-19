import type { PersonRef, StudentInsight } from "@/api/client";
import { insightOverview, loadStudentSignals } from "./insight-students";
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
