import { For } from "solid-js";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/stores/preferences-context";

const SUGGESTION_KEYS: MessageKey[] = ["ai.suggest1", "ai.suggest2", "ai.suggest3", "ai.suggest4"];

export function CelebiSuggestions(props: { onPick: (text: string) => void }) {
  const t = useT();
  return (
    <div class="grid gap-2 sm:grid-cols-2">
      <For each={SUGGESTION_KEYS}>
        {(key) => (
          <button
            type="button"
            class="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs leading-5 text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-muted active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => props.onPick(t(key))}
          >
            {t(key)}
          </button>
        )}
      </For>
    </div>
  );
}
