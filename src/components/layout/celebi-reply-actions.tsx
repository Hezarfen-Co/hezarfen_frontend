import { For, Show } from "solid-js";
import type { ChatbotNavigation } from "@/api/chatbot";
import { IconChevronRight, IconSparkles } from "@/components/ui/icons";
import { safeCelebiRoute } from "@/lib/celebi-route";
import { useT } from "@/stores/preferences-context";

const MAX_SUGGESTIONS = 3;

/**
 * The actionable half of an answer: the page it can take the user to, and the
 * follow-up questions it offers when it is not sure what was meant. Both come
 * from `chat.reply`; an answer that carries neither renders nothing at all.
 */
export function CelebiReplyActions(props: {
  navigation?: ChatbotNavigation | null;
  suggestions?: string[] | null;
  onNavigate: (route: string) => void;
  onPick: (text: string) => void;
}) {
  const t = useT();
  const route = () => safeCelebiRoute(props.navigation?.route);
  const label = () => props.navigation?.label?.trim() || t("ai.goTo");
  const suggestions = () =>
    (props.suggestions ?? []).map((text) => text.trim()).filter(Boolean).slice(0, MAX_SUGGESTIONS);

  return (
    <Show when={route() || suggestions().length > 0}>
      <div class="mt-3 space-y-2 border-t border-border/60 pt-2.5">
        <Show when={route()}>
          {(target) => (
            <button
              type="button"
              class="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => props.onNavigate(target())}
            >
              <span class="truncate">{label()}</span>
              <IconChevronRight class="h-3.5 w-3.5 shrink-0" />
            </button>
          )}
        </Show>

        <Show when={suggestions().length > 0}>
          <div class="space-y-1.5">
            <p class="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <IconSparkles class="h-3 w-3" />
              {t("ai.didYouMean")}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <For each={suggestions()}>
                {(text) => (
                  <button
                    type="button"
                  class="max-w-full rounded-full border border-border bg-card px-2.5 py-1 text-left text-xs leading-5 text-foreground transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => props.onPick(text)}
                  >
                    {text}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}
