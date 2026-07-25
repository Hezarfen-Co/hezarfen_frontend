import type { Choice } from "@/api/client";

/** One editable choice row: a stable key, its text, and a not-yet-uploaded image. */
export type ChoiceRow = Choice & { image: File | null };

/** The whole choices region of the question form. `correct` names a row by id. */
export type ChoiceSet = {
  rows: ChoiceRow[];
  correct: string | null;
};

let minted = 0;

/**
 * Key for a row the server has never seen. The server keeps any submitted key it
 * already stores and treats every other key as a new option, so this only has to
 * be unique within one payload — and `correct` can name a brand-new row with it.
 * `:` is not in Crockford base32, so it can never collide with a stored ULID.
 */
export function newChoiceId(): string {
  minted += 1;
  return `new:${minted}`;
}

export function blankChoiceSet(count = 4): ChoiceSet {
  return { rows: Array.from({ length: count }, () => ({ id: newChoiceId(), text: "", image: null })), correct: null };
}

/** Edit an existing question: stored ids come along, so images stay attached. */
export function storedChoiceSet(choices: Choice[] | null | undefined, correct: string | null | undefined): ChoiceSet {
  if (!choices) return blankChoiceSet();
  return {
    rows: choices.map((choice) => ({ id: choice.id, text: choice.text, image: null })),
    correct: correct ?? null,
  };
}

export function addChoice(set: ChoiceSet, max: number): ChoiceSet {
  if (set.rows.length >= max) return set;
  return { ...set, rows: [...set.rows, { id: newChoiceId(), text: "", image: null }] };
}

/** Removing the marked row unmarks it — there is no neighbouring index to fall back to. */
export function removeChoice(set: ChoiceSet, id: string): ChoiceSet {
  return {
    rows: set.rows.filter((row) => row.id !== id),
    correct: set.correct === id ? null : set.correct,
  };
}

export function setChoiceText(set: ChoiceSet, id: string, text: string): ChoiceSet {
  return { ...set, rows: set.rows.map((row) => (row.id === id ? { ...row, text } : row)) };
}

export function setChoiceImage(set: ChoiceSet, id: string, image: File | null): ChoiceSet {
  return { ...set, rows: set.rows.map((row) => (row.id === id ? { ...row, image } : row)) };
}

export function setCorrect(set: ChoiceSet, id: string): ChoiceSet {
  return set.rows.some((row) => row.id === id) ? { ...set, correct: id } : set;
}

/** Move a row to another position; ids travel with their text, image and mark. */
export function moveChoice(set: ChoiceSet, id: string, to: number): ChoiceSet {
  const from = set.rows.findIndex((row) => row.id === id);
  if (from < 0 || to < 0 || to >= set.rows.length || to === from) return set;
  const rows = [...set.rows];
  const [row] = rows.splice(from, 1);
  rows.splice(to, 0, row);
  return { ...set, rows };
}

/**
 * What actually goes on the wire: blank rows dropped, ids kept. Every row carries
 * a key, so the server re-attaches each surviving option's picture itself — no
 * index bookkeeping, no download-and-reupload. `correct` is null when the marked
 * row was left blank or never picked; the caller reports that to the user.
 */
export function submitChoices(set: ChoiceSet): { choices: Choice[]; images: (File | null)[]; correct: string | null } {
  const kept = set.rows.map((row) => ({ ...row, text: row.text.trim() })).filter((row) => row.text);
  return {
    choices: kept.map((row) => ({ id: row.id, text: row.text })),
    images: kept.map((row) => row.image),
    correct: kept.some((row) => row.id === set.correct) ? set.correct : null,
  };
}
