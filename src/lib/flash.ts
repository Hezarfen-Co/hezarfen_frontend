import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

/** Short-lived success banner; auto-clears after `ms` (default 3s). */
export function createFlash(ms = 3000): [Accessor<string>, (text: string) => void] {
  const [message, setMessage] = createSignal("");
  const [tick, setTick] = createSignal(0);
  createEffect(() => {
    tick();
    const text = message();
    if (!text) return;
    const id = window.setTimeout(() => setMessage(""), ms);
    onCleanup(() => window.clearTimeout(id));
  });
  return [message, (text) => {
    setMessage(text);
    setTick((value) => value + 1);
  }];
}
