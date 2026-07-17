import { createEffect, createSignal, onCleanup, type Accessor, type Setter } from "solid-js";

/** Short-lived success banner; auto-clears after `ms` (default 3s). */
export function createFlash(ms = 3000): [Accessor<string>, Setter<string>] {
  const [message, setMessage] = createSignal("");
  createEffect(() => {
    const text = message();
    if (!text) return;
    const id = window.setTimeout(() => setMessage(""), ms);
    onCleanup(() => window.clearTimeout(id));
  });
  return [message, setMessage];
}
