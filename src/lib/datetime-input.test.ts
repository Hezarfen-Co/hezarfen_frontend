import { dateInputToEndOfDayMs, dateTimeInputToMs } from "./datetime-input";

it("parses a valid date + time to the matching local ms", () => {
  const ms = dateTimeInputToMs("15/03/2027", "09:30");
  expect(ms).toBe(new Date(2027, 2, 15, 9, 30, 0, 0).getTime());
});

it("rejects malformed or overflowing input", () => {
  expect(dateTimeInputToMs("15/13/2027", "09:30")).toBeNull();
  expect(dateTimeInputToMs("32/03/2027", "09:30")).toBeNull();
  expect(dateTimeInputToMs("15/03/2027", "9:30")).toBeNull();
  expect(dateTimeInputToMs("", "")).toBeNull();
});

it("maps a repeat-until date to end of day", () => {
  expect(dateInputToEndOfDayMs("15/03/2027")).toBe(new Date(2027, 2, 15, 23, 59, 0, 0).getTime());
  expect(dateInputToEndOfDayMs("bad")).toBeNull();
});
