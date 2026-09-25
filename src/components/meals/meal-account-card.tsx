import { For, Show } from "solid-js";
import type { DietaryProfile } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { dietaryTagLabel, formatTry } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** Balance (when the viewer may read money) and the dietary profile, side by side in one card. */
export function MealAccountCard(props: {
  showBalance: boolean;
  balanceMinor?: number;
  profile?: DietaryProfile | null;
  moneyLocale: string;
}) {
  const t = useT();
  return (
    <section class="data-shell divide-y divide-border-hairline" aria-label={t("meals.myAccount")}>
      <Show when={props.showBalance}>
        <div class="p-4">
          <h2 class="text-xs text-muted-foreground">{t("meals.balance")}</h2>
          <p class="mt-1 text-2xl font-semibold tabular-nums text-text-strong">
            {props.balanceMinor == null ? "—" : formatTry(props.balanceMinor, props.moneyLocale)}
          </p>
        </div>
      </Show>
      <div class="space-y-2 p-4">
        <h2 class="text-xs text-muted-foreground">{t("meals.dietaryProfile")}</h2>
        <Show when={(props.profile?.tags.length ?? 0) > 0}>
          <div class="flex flex-wrap gap-1.5">
            <For each={props.profile?.tags ?? []}>{(tag) => <Badge variant="warning">{dietaryTagLabel(tag, t)}</Badge>}</For>
          </div>
        </Show>
        <p class="text-sm text-muted-foreground">{props.profile?.note || t("meals.noDietaryNotes")}</p>
      </div>
    </section>
  );
}
