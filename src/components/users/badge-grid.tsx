import { Collapsible } from "@kobalte/core/collapsible";
import { For, Match, Show, Switch, createMemo } from "solid-js";
import type { BadgeCatalogEntry, EarnedBadge, ProfileStats } from "@/api/client";
import {
  IconChevronDown,
  IconClipboardCheck,
  IconClock,
  IconExam,
  IconHomework,
  IconLock,
  IconSparkles,
} from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  badgeDescKey,
  badgeNameKey,
  badgeProgress,
  badgeProgressLabel,
  badgeProgressRatio,
  badgeRemaining,
  badgeThresholdLabel,
} from "@/lib/badges";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

function StatIcon(props: { stat: string; class?: string }) {
  return (
    <Switch fallback={<IconSparkles class={props.class} />}>
      <Match when={props.stat === "homework_submitted"}>
        <IconHomework class={props.class} />
      </Match>
      <Match when={props.stat === "homework_on_time"}>
        <IconClipboardCheck class={props.class} />
      </Match>
      <Match when={props.stat === "exam_sat"}>
        <IconExam class={props.class} />
      </Match>
      <Match when={props.stat.startsWith("pomodoro")}>
        <IconClock class={props.class} />
      </Match>
    </Switch>
  );
}

export function BadgeGrid(props: {
  /** The whole catalogue, from limits.badges.catalog — unearned entries stay
   *  visible and locked, so the goal is legible before it is reached. */
  catalog: BadgeCatalogEntry[];
  earned: EarnedBadge[];
  stats: ProfileStats;
}) {
  const t = useT();
  const prefs = usePreferences();

  const earnedAt = createMemo(() => {
    const map = new Map<string, number>();
    for (const b of props.earned) map.set(b.id, b.earned_at);
    return map;
  });

  // A badge the backend ships before this build has copy for it must still
  // render, so both lookups fall back rather than throwing.
  const label = (id: string) => {
    const key = badgeNameKey(id);
    return key ? t(key) : id;
  };
  const description = (id: string) => {
    const key = badgeDescKey(id);
    return key ? t(key) : "";
  };

  const earnedCount = createMemo(
    () => props.catalog.filter((entry) => earnedAt().has(entry.id)).length,
  );
  const overallRatio = () =>
    props.catalog.length === 0 ? 0 : earnedCount() / props.catalog.length;

  return (
    <Collapsible defaultOpen class="group/badges rounded-lg border bg-card shadow-xs">
      <Collapsible.Trigger class="flex w-full items-center gap-3 px-4 py-3 text-left outline-hidden transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring ui-expanded:border-b ui-expanded:border-border">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
          <IconSparkles class="h-3.5 w-3.5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">{t("badges.title")}</span>
          <span class="block text-xs text-muted-foreground">{t("badges.subtitle")}</span>
        </span>
        <Show when={props.catalog.length > 0}>
          <span class="hidden items-center gap-2 sm:flex">
            <span class="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <span
                class="block h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${overallRatio() * 100}%` }}
              />
            </span>
            <span class="text-xs tabular-nums text-muted-foreground">
              {t("badges.earnedCount", { earned: earnedCount(), total: props.catalog.length })}
            </span>
          </span>
        </Show>
        <IconChevronDown class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-expanded/badges:rotate-180" />
      </Collapsible.Trigger>

      <Collapsible.Content>
      <div class="p-4">
      <Show
        when={props.catalog.length > 0}
        fallback={<p class="text-sm text-muted-foreground">{t("badges.none")}</p>}
      >
        {/* A horizontal rail rather than a grid: thirteen tiles would otherwise
            push the rest of the profile off the first screen. Snap points keep
            a card from being cut in half mid-scroll, and the edge fade says
            there is more to the right without spending a control on it. */}
        <div class="relative">
          <div
            role="list"
            class="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]"
          >
          <For each={props.catalog}>
            {(entry) => {
              const at = () => earnedAt().get(entry.id);
              const current = () => badgeProgress(entry.stat, props.stats) ?? 0;
              const tracked = () => badgeProgress(entry.stat, props.stats) !== null;
              const ratio = () => badgeProgressRatio(current(), entry.threshold);
              const left = () => badgeRemaining(entry.stat, current(), entry.threshold);
              const isHours = entry.stat === "pomodoro_focus_ms";

              // The tooltip enriches; it never carries the only copy of
              // anything, since a touch device can never open one.
              const hint = () =>
                at()
                  ? t("badges.earnedOn", { date: formatDate(at()!, prefs.locale()) })
                  : tracked()
                    ? t(isHours ? "badges.remainingHours" : "badges.remaining", { count: left() })
                    : t("badges.locked");

              return (
                <Tooltip openDelay={200} closeDelay={80}>
                  <TooltipTrigger
                    as="div"
                    role="listitem"
                    // Focusable so the tooltip is reachable without a pointer;
                    // the label repeats what the tooltip would say, since a
                    // tooltip can never be opened by touch.
                    tabindex="0"
                    aria-label={`${label(entry.id)} — ${hint()}`}
                    class={cn(
                      "flex w-60 shrink-0 snap-start gap-3 rounded-lg border bg-card p-3 text-left shadow-xs outline-hidden transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      at() ? "border-primary/40" : "border-border/70",
                    )}
                  >
                    <span
                      class={cn(
                        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        at() ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground grayscale",
                      )}
                    >
                      <StatIcon stat={entry.stat} class="h-5 w-5" />
                      {/* A locked badge reads as locked, not as disabled: the
                          padlock says "not yet", dimming alone says "off". */}
                      <Show when={!at()}>
                        <span class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-card bg-muted-foreground/80 text-card">
                          <IconLock class="h-2.5 w-2.5" />
                        </span>
                      </Show>
                    </span>

                    <div class="min-w-0 flex-1 space-y-1">
                      <p class={cn("truncate text-sm font-semibold", !at() && "text-muted-foreground")}>
                        {label(entry.id)}
                      </p>
                      <p class="line-clamp-2 text-xs text-muted-foreground">{description(entry.id)}</p>

                      <Show
                        when={!at() && tracked()}
                        fallback={
                          <p class="text-[11px] tabular-nums text-muted-foreground">{hint()}</p>
                        }
                      >
                        <div class="space-y-1">
                          <span class="block h-1 overflow-hidden rounded-full bg-muted">
                            <span
                              class="block h-full rounded-full bg-muted-foreground/60 transition-[width] duration-500"
                              style={{ width: `${ratio() * 100}%` }}
                            />
                          </span>
                          <p class="text-[11px] tabular-nums text-muted-foreground">
                            {badgeProgressLabel(entry.stat, current())} /{" "}
                            {badgeThresholdLabel(entry.stat, entry.threshold)}
                          </p>
                        </div>
                      </Show>
                    </div>
                  </TooltipTrigger>

                  <TooltipContent>
                    <p class="font-semibold">{label(entry.id)}</p>
                    <Show when={description(entry.id)}>
                      <p class="mt-0.5 text-muted-foreground">{description(entry.id)}</p>
                    </Show>
                    <p class="mt-1 tabular-nums">{hint()}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }}
            </For>
          </div>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent"
          />
        </div>
      </Show>
      </div>
      </Collapsible.Content>
    </Collapsible>
  );
}
