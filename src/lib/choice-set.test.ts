import { expect, test } from "vitest";
import {
  addChoice,
  blankChoiceSet,
  moveChoice,
  newChoiceId,
  removeChoice,
  setChoiceText,
  setCorrect,
  storedChoiceSet,
  submitChoices,
} from "./choice-set";

const stored = () =>
  storedChoiceSet([{ id: "A", text: "one" }, { id: "B", text: "two" }, { id: "C", text: "three" }], "B");

test("a fresh set pre-marks nothing", () => {
  const set = blankChoiceSet();
  expect(set.rows).toHaveLength(4);
  expect(set.correct).toBeNull();
  expect(new Set(set.rows.map((r) => r.id)).size).toBe(4);
});

test("minted ids are unique and cannot collide with a stored ULID", () => {
  expect(newChoiceId()).not.toBe(newChoiceId());
  expect(newChoiceId()).toContain(":"); // ':' is not in Crockford base32
});

test("dropping a blank row leaves the marked row's id untouched", () => {
  const set = setChoiceText(stored(), "A", "   ");
  expect(submitChoices(set)).toEqual({
    choices: [{ id: "B", text: "two" }, { id: "C", text: "three" }],
    images: [null, null],
    correct: "B",
  });
});

test("reordering carries ids, so the answer key follows its choice", () => {
  const moved = moveChoice(stored(), "B", 2);
  expect(moved.rows.map((r) => r.id)).toEqual(["A", "C", "B"]);
  expect(submitChoices(moved).correct).toBe("B");
});

test("removing or blanking the marked row unmarks it instead of shifting the key", () => {
  expect(removeChoice(stored(), "B").correct).toBeNull();
  expect(submitChoices(setChoiceText(stored(), "B", "")).correct).toBeNull();
});

test("a new row is markable, because it carries a client-minted key", () => {
  const added = addChoice(stored(), 10);
  const fresh = added.rows[3].id;
  const marked = setChoiceText(setCorrect(added, fresh), fresh, "four");
  const out = submitChoices(marked);
  expect(out.correct).toBe(fresh);
  expect(out.choices.map((c) => c.id)).toContain(fresh);
});

test("add respects the max and setCorrect ignores an unknown id", () => {
  expect(addChoice(blankChoiceSet(10), 10).rows).toHaveLength(10);
  expect(setCorrect(stored(), "nope").correct).toBe("B");
});
