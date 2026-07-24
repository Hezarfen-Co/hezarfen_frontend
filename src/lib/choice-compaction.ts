export type CompactedChoices = {
  choices: string[];
  images: (File | null)[];
  /** Index each surviving choice had in the stored question, -1 if added in this edit. */
  sources: number[];
  /** Index of the correct choice after compaction, or -1 if that row was left blank. */
  correct: number;
};

/**
 * Editing a question drops blank choices before submit, which shifts every index
 * after the gap. Everything keyed by position — the answer key and the per-option
 * images — has to move with it, so do the drop once, here, and hand back the
 * already-shifted values.
 */
export function compactChoices(
  choices: string[],
  images: (File | null)[],
  /** Original index per row as displayed, -1 for a row added in this edit. */
  sources: number[],
  /** Row the user marked correct, as an index into `choices`. */
  correct: number,
): CompactedChoices {
  const kept = choices
    .map((choice, row) => ({ choice: choice.trim(), image: images[row] ?? null, source: sources[row] ?? -1, row }))
    .filter((item) => item.choice);
  return {
    choices: kept.map((item) => item.choice),
    images: kept.map((item) => item.image),
    sources: kept.map((item) => item.source),
    // Follow the row the user actually picked; -1 means they blanked it and must choose again.
    correct: kept.findIndex((item) => item.row === correct),
  };
}

/**
 * A PATCH carrying `choices` deletes every stored option image server-side, so a
 * choice edit has to re-upload the images the user kept. Blank choices are dropped
 * on submit, so the option an image came from (its `source`) and the slot it must
 * go back to (its new index) are different numbers — uploading to the old index
 * either lands on the wrong option or is rejected as out of range.
 */
export function planChoiceImageRestore(
  /** `QuestionValues.choice_sources`: original index per surviving choice, -1 if new. */
  sources: number[],
  /** `choice_images` as stored on the server today, indexed by original position. */
  stored: (unknown | null)[],
  /** Freshly picked files per surviving choice; a replaced option needs no restore. */
  replacements: (File | null)[] | null,
): { index: number; source: number }[] {
  return sources
    .map((source, index) => ({ index, source }))
    .filter((slot) => slot.source >= 0 && stored[slot.source] != null && !replacements?.[slot.index]);
}
