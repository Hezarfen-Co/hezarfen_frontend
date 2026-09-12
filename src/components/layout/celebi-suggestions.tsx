import { For } from "solid-js";
import type { MessageKey } from "@/i18n/messages";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

const STUDENT_KEYS: MessageKey[] = ["ai.suggest1", "ai.suggest2", "ai.suggest3", "ai.suggest4"];
const STAFF_KEYS: MessageKey[] = ["ai.suggestStaff1", "ai.suggestStaff2", "ai.suggestStaff3", "ai.suggestStaff4"];
const PARENT_KEYS: MessageKey[] = ["ai.suggestParent1", "ai.suggestParent2", "ai.suggestParent3", "ai.suggestParent4"];

export function CelebiSuggestions(props: { onPick: (text: string) => void }) {
  const t = useT();
  const auth = useAuth();
  const keys = () => {
    const role = auth.user()?.role;
    if (role === "parent") return PARENT_KEYS;
    if (role === "teacher" || role === "manager" || role === "admin") return STAFF_KEYS;
    return STUDENT_KEYS;
  };
  return (
    <div class="grid gap-2 sm:grid-cols-2">
      <For each={keys()}>
        {(key) => (
          <button
            type="button"
            class="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs leading-5 text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-muted active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => props.onPick(t(key))}
          >
            {t(key)}
          </button>
        )}
      </For>
    </div>
  );
}
