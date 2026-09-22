import {
  eventStatusLabelKey,
  isRollCallOpen,
  orderRollCallStatuses,
  rollCallChanges,
  saveRollCallChanges,
} from "@/lib/event-roll-call";

test("core statuses get event wording, school-defined ones do not", () => {
  expect(eventStatusLabelKey("present")).toBe("events.status.present");
  expect(eventStatusLabelKey("absent")).toBe("events.status.absent");
  expect(eventStatusLabelKey("late")).toBe("events.status.late");
  expect(eventStatusLabelKey("excused")).toBe("events.status.excused");
  expect(eventStatusLabelKey("medical")).toBeNull();
});

test("present leads the status list, the rest keep the school's order", () => {
  expect(orderRollCallStatuses(["absent", "late", "present", "excused"])).toEqual(["present", "absent", "late", "excused"]);
  expect(orderRollCallStatuses(["absent", "late"])).toEqual(["absent", "late"]);
});

test("only drafted statuses that differ from the saved mark are sent", () => {
  const saved = { a: "present", b: null, c: "late" };
  const draft = { a: "present", b: "absent", c: "excused", d: "present" };
  expect(rollCallChanges(saved, draft)).toEqual([
    { userId: "b", status: "absent" },
    { userId: "c", status: "excused" },
    { userId: "d", status: "present" },
  ]);
});

test("an empty draft has nothing to save", () => {
  expect(rollCallChanges({ a: "present" }, {})).toEqual([]);
  expect(rollCallChanges({ a: "present" }, { a: undefined })).toEqual([]);
});

test("roll call opens at the start time, or at once without one", () => {
  expect(isRollCallOpen(2000, 1000)).toBe(false);
  expect(isRollCallOpen(1000, 1000)).toBe(true);
  expect(isRollCallOpen(1000, 2000)).toBe(true);
  expect(isRollCallOpen(null, 0)).toBe(true);
  expect(isRollCallOpen(undefined, 0)).toBe(true);
});

test("saving sends rows in order, keeps going past a failure and reports progress", async () => {
  const sent: string[] = [];
  const progress: [number, number][] = [];
  const boom = new Error("outside audience");
  const result = await saveRollCallChanges(
    [
      { userId: "a", status: "present" },
      { userId: "b", status: "absent" },
      { userId: "c", status: "late" },
    ],
    async (change) => {
      sent.push(change.userId);
      if (change.userId === "b") throw boom;
    },
    (done, total) => progress.push([done, total]),
  );
  expect(sent).toEqual(["a", "b", "c"]);
  expect(result.saved.map((change) => change.userId)).toEqual(["a", "c"]);
  expect(result.failed).toEqual([{ change: { userId: "b", status: "absent" }, error: boom }]);
  expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
});
