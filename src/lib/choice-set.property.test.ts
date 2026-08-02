import fc from "fast-check";
import { expect, test } from "vitest";
import {
  addChoice,
  blankChoiceSet,
  type ChoiceSet,
  moveChoice,
  removeChoice,
  setChoiceImage,
  setChoiceText,
  setCorrect,
  storedChoiceSet,
  submitChoices,
} from "./choice-set";

/**
 * The example tests pin down seven known edits. These generate the edits
 * instead, because every bug this reducer exists to kill lived in a *relation*
 * between values — a row, its picture, the answer key, a student's answer —
 * and an example can only re-assert the author's own mental model of it.
 *
 * The one invariant, restated: anything attached to a row (text, picture, the
 * correct mark) stays attached to that row's id across any sequence of edits.
 */

const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ulidArb = fc
  .array(fc.constantFrom(...BASE32.split("")), { minLength: 26, maxLength: 26 })
  .map((chars) => chars.join(""));

/** Blank, whitespace-only, duplicated and arbitrary texts all matter here. */
const textArb = fc.oneof(
  fc.constant(""),
  fc.constant("   "),
  fc.constant("dup"),
  fc.string({ maxLength: 8 }),
);

let stamped = 0;
const stampFile = () => ({ name: `f${(stamped += 1)}` }) as unknown as File;

type Op =
  | { t: "add" }
  | { t: "remove"; p: number }
  | { t: "move"; p: number; q: number }
  | { t: "text"; p: number; text: string }
  | { t: "image"; p: number; keep: boolean }
  | { t: "correct"; p: number }
  | { t: "correctUnknown"; id: string };

const pick = fc.double({ min: 0, max: 0.999, noNaN: true });
const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.constant<Op>({ t: "add" }),
  fc.record({ t: fc.constant<"remove">("remove"), p: pick }),
  fc.record({ t: fc.constant<"move">("move"), p: pick, q: pick }),
  fc.record({ t: fc.constant<"text">("text"), p: pick, text: textArb }),
  fc.record({ t: fc.constant<"image">("image"), p: pick, keep: fc.boolean() }),
  fc.record({ t: fc.constant<"correct">("correct"), p: pick }),
  fc.record({ t: fc.constant<"correctUnknown">("correctUnknown"), id: fc.oneof(ulidArb, fc.constant("new:0")) }),
);

/** Starting points: fresh forms, stored questions, empty sets, sets at max. */
const startArb = fc.integer({ min: 2, max: 10 }).chain((max) =>
  fc.oneof(
    fc.integer({ min: 0, max }).map((n) => ({ max, set: blankChoiceSet(n) })),
    fc
      .uniqueArray(fc.record({ id: ulidArb, text: textArb }), { maxLength: max, selector: (c) => c.id })
      .chain((choices) =>
        (choices.length ? fc.option(fc.constantFrom(...choices.map((c) => c.id)), { nil: null }) : fc.constant(null))
          .map((correct) => ({ max, set: storedChoiceSet(choices, correct) })),
      ),
  ),
);

const ids = (set: ChoiceSet) => set.rows.map((row) => row.id);
const at = (set: ChoiceSet, p: number) => (set.rows.length ? set.rows[Math.floor(p * set.rows.length)].id : "absent");

/** Apply one op and return it plus the id it was allowed to touch (if any). */
function apply(set: ChoiceSet, op: Op, max: number): { next: ChoiceSet; touched: string | null } {
  switch (op.t) {
    case "add":
      return { next: addChoice(set, max), touched: null };
    case "remove":
      return { next: removeChoice(set, at(set, op.p)), touched: at(set, op.p) };
    case "move":
      return { next: moveChoice(set, at(set, op.p), Math.floor(op.q * Math.max(set.rows.length, 1))), touched: null };
    case "text":
      return { next: setChoiceText(set, at(set, op.p), op.text), touched: at(set, op.p) };
    case "image":
      return { next: setChoiceImage(set, at(set, op.p), op.keep ? stampFile() : null), touched: at(set, op.p) };
    case "correct":
      return { next: setCorrect(set, at(set, op.p)), touched: null };
    case "correctUnknown":
      return { next: setCorrect(set, op.id), touched: null };
  }
}

test("every edit sequence keeps text, picture and answer key attached to their row id", () => {
  fc.assert(
    fc.property(startArb, fc.array(opArb, { maxLength: 25 }), ({ max, set: start }, ops) => {
      let set = start;
      for (const op of ops) {
        const before = set;
        const { next, touched } = apply(set, op, max);
        set = next;

        // Ids are unique at all times, and the row count never exceeds max.
        expect(new Set(ids(set)).size).toBe(set.rows.length);
        expect(set.rows.length).toBeLessThanOrEqual(max);

        // No op invents or duplicates an id: add appends exactly one new id,
        // remove drops exactly the targeted one, everything else permutes.
        const gained = ids(set).filter((id) => !ids(before).includes(id));
        const lost = ids(before).filter((id) => !ids(set).includes(id));
        expect(gained.length).toBe(op.t === "add" && before.rows.length < max ? 1 : 0);
        expect(lost).toEqual(op.t === "remove" && ids(before).includes(touched!) ? [touched] : []);

        // The attachment invariant: a surviving row the op did not target keeps
        // its exact text and its exact File object, whatever moved around it.
        for (const row of set.rows) {
          const was = before.rows.find((r) => r.id === row.id);
          if (!was || row.id === touched) continue;
          expect(row.text).toBe(was.text);
          expect(row.image).toBe(was.image);
        }

        // `correct` only ever names a live row (or nothing) — never an index,
        // never a removed row.
        if (set.correct !== null) expect(ids(set)).toContain(set.correct);
      }

      const out = submitChoices(set);
      const outIds = out.choices.map((c) => c.id);

      // Output is a subset of the live rows, in row order, no id invented or
      // duplicated, and it is exactly the non-blank rows.
      expect(new Set(outIds).size).toBe(outIds.length);
      expect(outIds).toEqual(ids(set).filter((id) => set.rows.find((r) => r.id === id)!.text.trim()));
      for (const [i, choice] of out.choices.entries()) {
        const row = set.rows.find((r) => r.id === choice.id)!;
        expect(choice.text).toBe(row.text.trim());
        // The picture rides the id, not the position, after blanks are dropped.
        expect(out.images[i]).toBe(row.image);
      }

      // The answer key survives the drop iff its row survived it.
      const marked = set.rows.find((r) => r.id === set.correct);
      expect(out.correct).toBe(marked && marked.text.trim() ? set.correct : null);
      if (out.correct !== null) expect(outIds).toContain(out.correct);
    }),
    { numRuns: 500 },
  );
});

test("reordering is invisible on the wire: same rows, same pictures, same answer key", () => {
  fc.assert(
    fc.property(startArb, fc.array(fc.record({ p: pick, q: pick }), { maxLength: 15 }), ({ set: start }, moves) => {
      // Give every row a distinguishable picture so a positional mix-up shows.
      let set = start.rows.reduce((acc, row) => setChoiceImage(acc, row.id, stampFile()), start);
      const before = submitChoices(set);
      for (const move of moves) {
        set = moveChoice(set, at(set, move.p), Math.floor(move.q * Math.max(set.rows.length, 1)));
      }
      const after = submitChoices(set);

      expect(after.correct).toBe(before.correct);
      expect([...after.choices].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
        [...before.choices].sort((a, b) => a.id.localeCompare(b.id)),
      );
      // Each id keeps its own File across the reordering.
      const pairs = (out: typeof before) => out.choices.map((c, i) => [c.id, out.images[i]] as const);
      expect(new Map(pairs(after))).toEqual(new Map(pairs(before)));
    }),
    { numRuns: 300 },
  );
});
