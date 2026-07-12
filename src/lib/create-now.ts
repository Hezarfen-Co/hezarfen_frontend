import { createSignal, onCleanup } from "solid-js";

export function createNow(intervalMs = 1000) {
  const [now, setNow] = createSignal(Date.now());
  const interval = setInterval(() => setNow(Date.now()), intervalMs);
  onCleanup(() => clearInterval(interval));
  return now;
}
