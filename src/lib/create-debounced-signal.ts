import { createSignal, onCleanup } from "solid-js";

/**
 * Text input signal plus a copy that only catches up `delay` ms after typing
 * stops — bind the raw one to the input, the debounced one to the query params.
 */
export function createDebouncedSignal(initial = "", delay = 300) {
  const [raw, setRaw] = createSignal(initial);
  const [debounced, setDebounced] = createSignal(initial);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const set = (value: string) => {
    setRaw(value);
    clearTimeout(timer);
    timer = setTimeout(() => setDebounced(value), delay);
  };
  onCleanup(() => clearTimeout(timer));
  return [raw, set, debounced] as const;
}
