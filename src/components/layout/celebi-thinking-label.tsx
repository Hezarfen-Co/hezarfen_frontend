import { createSignal, onCleanup } from "solid-js";
import { useT } from "@/stores/preferences-context";

const ROTATE_MS = 1_800;
const KEYS = ["ai.thinking1", "ai.thinking2", "ai.thinking3"] as const;

export function CelebiThinkingLabel() {
  const t = useT();
  const [index, setIndex] = createSignal(0);
  const timer = window.setInterval(() => setIndex((i) => (i + 1) % KEYS.length), ROTATE_MS);
  onCleanup(() => window.clearInterval(timer));
  return <>{t(KEYS[index()])}</>;
}
