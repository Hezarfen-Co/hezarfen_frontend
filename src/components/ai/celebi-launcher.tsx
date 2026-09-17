import { For } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconSparkles } from "@/components/ui/icons";
import { openCelebiPanel } from "@/stores/celebi-panel";
import { useT } from "@/stores/preferences-context";

// Çelebi itself is a shell panel — it follows the viewer across every route,
// so the hub tab opens that one panel instead of mounting a second chat.
export function CelebiLauncher() {
  const t = useT();
  const examples = () => [t("aiHub.celebiExample1"), t("aiHub.celebiExample2"), t("aiHub.celebiExample3")];

  return (
    <section class="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-10 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconSparkles class="h-6 w-6" />
      </div>
      <div class="space-y-1">
        <p class="text-base font-semibold text-text-strong">{t("ai.title")}</p>
        <p class="text-sm text-muted-foreground">{t("ai.empty")}</p>
      </div>
      <ul class="grid w-full gap-2 text-left sm:grid-cols-3">
        <For each={examples()}>
          {(example) => (
            <li class="rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-xs">
              {example}
            </li>
          )}
        </For>
      </ul>
      <Button size="sm" class="min-w-[7.5rem] rounded-lg" onClick={openCelebiPanel}>
        <IconSparkles class="h-4 w-4" />
        {t("ai.askCelebi")}
      </Button>
      <p class="text-xs text-muted-foreground">{t("aiHub.celebiHint")}</p>
    </section>
  );
}
