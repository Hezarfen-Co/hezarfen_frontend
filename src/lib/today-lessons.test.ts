import { dayBounds, rollCallState, sessionsToday } from "./today-lessons";

const at = (h: number, m = 0) => new Date(2026, 8, 18, h, m).getTime();

it("keeps only today's sessions, earliest first", () => {
  const [start, end] = dayBounds(at(12));
  const sessions = [
    { id: "late", starts_at: at(14) },
    { id: "yesterday", starts_at: start - 1 },
    { id: "early", starts_at: at(8, 30) },
    { id: "tomorrow", starts_at: end },
  ];
  expect(sessionsToday(sessions, at(12)).map((row) => row.id)).toEqual(["early", "late"]);
});

it("names what a lesson still needs", () => {
  expect(rollCallState(at(14), at(12), 0, 30)).toBe("upcoming");
  expect(rollCallState(at(9), at(12), 0, 30)).toBe("not-taken");
  expect(rollCallState(at(9), at(12), 12, 30)).toBe("partial");
  expect(rollCallState(at(9), at(12), 30, 30)).toBe("done");
  expect(rollCallState(at(9), at(12), 31, 30)).toBe("done");
  expect(rollCallState(at(9), at(12), null, 30)).toBeNull();
});
