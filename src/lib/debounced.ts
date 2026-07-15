import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

/** Debounce an accessor value; useful for search inputs. */
export function createDebounced<T>(source: Accessor<T>, ms = 300): Accessor<T> {
  const [value, setValue] = createSignal(source());
  createEffect(() => {
    const next = source();
    const timer = window.setTimeout(() => setValue(() => next), ms);
    onCleanup(() => window.clearTimeout(timer));
  });
  return value;
}
