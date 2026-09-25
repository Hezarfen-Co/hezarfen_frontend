import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const api = vi.hoisted(() => ({
  getCourses: vi.fn(),
  getExams: vi.fn(),
  getHomework: vi.fn(),
  getEvents: vi.fn(),
  getMyInstances: vi.fn(),
  loadInstanceLabels: vi.fn(),
}));

vi.mock("@/api/courses", () => ({ getCourses: api.getCourses }));
vi.mock("@/api/exams", () => ({ getExams: api.getExams }));
vi.mock("@/api/homework", () => ({ getHomework: api.getHomework }));
vi.mock("@/api/events", () => ({ getEvents: api.getEvents }));
vi.mock("@/api/instances", () => ({ getMyInstances: api.getMyInstances }));
vi.mock("@/lib/instance-labels", () => ({ loadInstanceLabels: api.loadInstanceLabels }));

import {
  filterCommandRecords,
  loadCommandRecords,
  resetCommandRecordCache,
  type CommandRecord,
} from "@/lib/command-search";

const page = <T,>(items: T[]) => ({ items, total: items.length, limit: 100, offset: 0 });
const record = (kind: CommandRecord["kind"], id: string, title: string, context: string | null = null): CommandRecord => ({
  kind,
  id,
  title,
  context,
  description: null,
  at: null,
});

describe("filterCommandRecords", () => {
  const records = [
    record("event", "ev1", "Biyoloji gezisi"),
    record("course", "c1", "Biyoloji"),
    record("course", "c2", "Kimya"),
    record("exam", "e1", "1. Yazılı", "Biyoloji — 10-B"),
    record("homework", "h1", "Hücre ödevi", "Biyoloji — 9-A"),
  ];

  test("matches titles and section labels, Turkish-folded, grouped in kind order", () => {
    expect(filterCommandRecords(records, "biyoloji").map((r) => r.id)).toEqual(["c1", "e1", "h1", "ev1"]);
    expect(filterCommandRecords(records, "BİYOLOJİ").map((r) => r.id)).toEqual(["c1", "e1", "h1", "ev1"]);
    expect(filterCommandRecords(records, "yazili").map((r) => r.id)).toEqual(["e1"]);
    expect(filterCommandRecords(records, "hucre 9a").map((r) => r.id)).toEqual(["h1"]);
  });

  test("a one-letter query matches nothing", () => {
    expect(filterCommandRecords(records, "b")).toEqual([]);
    expect(filterCommandRecords(records, "  ")).toEqual([]);
  });

  test("caps each kind", () => {
    const many = Array.from({ length: 8 }, (_, i) => record("course", `c${i}`, `Matematik ${i}`));
    expect(filterCommandRecords(many, "matematik", 3).map((r) => r.id)).toEqual(["c0", "c1", "c2"]);
  });
});

describe("loadCommandRecords", () => {
  beforeEach(() => {
    resetCommandRecordCache();
    api.getCourses.mockResolvedValue(page([{ id: "c1", title: "Biyoloji", description: "", kind: "course" }]));
    api.getExams.mockResolvedValue(
      page([
        { id: "e1", title: "Yazılı", description: "", class_course: "i1", starts_at: 5 },
        { id: "e2", title: "Quiz", description: "", class_course: "i2", starts_at: null },
      ]),
    );
    api.getHomework.mockResolvedValue(page([{ id: "h1", title: "Ödev", description: null, class_course: "i1", due_at: 7 }]));
    api.getEvents.mockResolvedValue(page([{ id: "ev1", title: "Gezi", description: "", starts_at: 9 }]));
    api.getMyInstances.mockResolvedValue(page([{ id: "i1" }]));
    api.loadInstanceLabels.mockResolvedValue(new Map([["i1", { label: "Biyoloji — 10-B" }]]));
  });
  afterEach(() => vi.clearAllMocks());

  test("a student reads their own courses and only exams in their own sections", async () => {
    // GET /courses is already scoped to the student's own courses.
    const out = await loadCommandRecords("student", ["course", "exam"]);
    expect(api.getCourses).toHaveBeenCalled();
    expect(out.map((r) => r.id)).toEqual(["c1", "e1"]);
    expect(out[1].context).toBe("Biyoloji — 10-B");
  });

  test("staff read the full catalog and every exam the backend returns", async () => {
    const out = await loadCommandRecords("teacher", ["course", "exam"]);
    expect(api.getCourses).toHaveBeenCalled();
    expect(api.getMyInstances).not.toHaveBeenCalled();
    expect(out.map((r) => r.id)).toEqual(["c1", "e1", "e2"]);
  });

  test("only the requested kinds are read, and a failing kind leaves the others", async () => {
    api.getEvents.mockRejectedValue(new Error("boom"));
    const out = await loadCommandRecords("parent", ["event", "homework"]);
    expect(api.getCourses).not.toHaveBeenCalled();
    expect(api.getExams).not.toHaveBeenCalled();
    expect(out.map((r) => r.id)).toEqual(["h1"]);
  });

  test("reopening within the cache window reuses the last read", async () => {
    await loadCommandRecords("teacher", ["course"], 1_000);
    await loadCommandRecords("teacher", ["course"], 30_000);
    expect(api.getCourses).toHaveBeenCalledTimes(1);
    await loadCommandRecords("teacher", ["course"], 120_000);
    expect(api.getCourses).toHaveBeenCalledTimes(2);
  });
});
