import type { ParentProps } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

export function ComingSoonBadge(props: { class?: string }) {
  const t = useT();
  return (
    <Badge variant="secondary" class={cn("bg-surface-tint text-text-subtle", props.class)}>
      {t("comingSoon.title")}
    </Badge>
  );
}

/**
 * Stands in for a value the design shows but no endpoint can fill yet. Renders
 * the slot the design allots so the layout keeps its shape, and says plainly
 * that the number is not here rather than printing a placeholder digit a
 * reader would take for real.
 */
export function ComingSoonValue(props: { class?: string }) {
  const t = useT();
  return (
    <span class={cn("inline-flex items-center gap-2 text-text-subtle", props.class)}>
      <span aria-hidden="true" class="text-lg leading-none">—</span>
      <span class="text-xs font-medium">{t("comingSoon.title")}</span>
    </span>
  );
}

export function ComingSoonPanel(props: ParentProps<{ title: string; class?: string }>) {
  const t = useT();
  return (
    <section class={cn("data-shell space-y-2 p-4", props.class)}>
      <div class="flex items-center justify-between gap-2">
        <h2 class="truncate text-sm font-semibold text-text-strong">{props.title}</h2>
        <ComingSoonBadge />
      </div>
      <p class="text-sm text-text-subtle">{t("comingSoon.description")}</p>
      {props.children}
    </section>
  );
}
