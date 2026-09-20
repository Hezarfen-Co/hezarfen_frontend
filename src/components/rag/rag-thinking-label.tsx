import { createSignal, onCleanup } from "solid-js";

const ROTATE_MS = 1_800;

/**
 * The "working on it" line while an answer is still pending.
 *
 * Retrieval here runs over the whole course corpus and takes longer than the
 * assistant popover's turn, and a single frozen sentence starts to read as a
 * stall. Rotating through the phases says the wait is expected — same device as
 * `CelebiThinkingLabel`, but the phrases come from this tree's own copy object
 * rather than the global message union.
 */
export function RagThinkingLabel(props: { phases: string[] }) {
  const [index, setIndex] = createSignal(0);
  const count = () => Math.max(1, props.phases.length);
  const timer = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
  onCleanup(() => window.clearInterval(timer));
  return <>{props.phases[index() % count()]}</>;
}
