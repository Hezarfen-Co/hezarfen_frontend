import { For, Show, createMemo, createSignal } from "solid-js";
import type { BadgeCatalogEntry, EarnedBadge, ProfileStats, Role } from "@/api/client";
import { PixelIcon, type PixelIconName } from "@/components/ui/pixel-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  badgeDescKey,
  badgeGroupKey,
  badgeLadders,
  badgeLevel,
  badgeNameKey,
  badgeProgress,
  badgeProgressLabel,
  badgeProgressRatio,
  badgeRemaining,
  badgeThresholdLabel,
  badgeTier,
  type BadgeTier,
} from "@/lib/badges";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

const STAT_ICON: Record<string, PixelIconName> = {
  homework_submitted: "notes",
  homework_on_time: "check-double",
  exam_sat: "pen-square",
  pomodoro_finished: "zap",
  pomodoro_focus_ms: "hourglass",
  marks_given: "pencil",
  lessons_held: "book-open",
  pool_approved: "checkbox-on",
  pool_published: "message-text",
  lessons_attended: "calendar-weeks",
  high_mark: "star",
  study_streak: "fire",
};

const TIER_MEDAL: Record<BadgeTier, string> = {
  bronze: "bg-amber-700/12 text-amber-700 ring-amber-700/25 dark:text-amber-500",
  silver: "bg-slate-400/15 text-slate-500 ring-slate-400/35 dark:text-slate-300",
  gold: "bg-yellow-400/20 text-yellow-600 ring-yellow-500/40 dark:text-yellow-400",
};

export const statIcon = (stat: string): PixelIconName => STAT_ICON[stat] ?? "sparkles";

/**
 * The profile's badge board: one card per counter, each a ladder of
 * bronze → silver → gold rungs. Unearned rungs stay visible and locked, so the
 * next goal is legible before it is reached; nothing here is scored beyond the
 * backend's own counters and thresholds.
 */
export function BadgeGrid(props: {
  /** The whole catalogue, from limits.badges.catalog. */
  catalog: BadgeCatalogEntry[];
  earned: EarnedBadge[];
  stats: ProfileStats;
  /** Whose profile this is — their role's ladders lead the board. */
  role?: Role;
}) {
  const t = useT();
  const prefs = usePreferences();

  const earnedAt = createMemo(() => new Map(props.earned.map((b) => [b.id, b.earned_at] as const)));
  const earnedCount = createMemo(() => props.catalog.filter((entry) => earnedAt().has(entry.id)).length);
  const current = (stat: string) => badgeProgress(stat, props.stats);
  const [showAll, setShowAll] = createSignal(false);
  // Ladders with earned rungs first, then the ones already in progress, then
  // the counters the owner's role actually moves; the rest fold away.
  const ladders = createMemo(() => {
    const staff = props.role === "teacher" || props.role === "manager" || props.role === "admin";
    const staffStats = new Set(["marks_given", "lessons_held", "pool_approved"]);
    const score = (ladder: { stat: string; entries: BadgeCatalogEntry[] }) => {
      const earned = ladder.entries.filter((entry) => earnedAt().has(entry.id)).length;
      const progress = (current(ladder.stat) ?? 0) > 0 ? 1 : 0;
      const relevant = props.role == null || staffStats.has(ladder.stat) === staff ? 1 : 0;
      return earned * 100 + progress * 10 + relevant;
    };
    return badgeLadders(props.catalog)
      .map((ladder, index) => ({ ladder, index, score: score(ladder) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((item) => item.ladder);
  });
  // Folded, the board shows exactly one grid row: 1 card on phones, 2 from
  // sm, 3 from xl — the extra preview cards hide below their breakpoint.
  const LADDER_PREVIEW = 3;
  const visibleLadders = () => (showAll() ? ladders() : ladders().slice(0, LADDER_PREVIEW));
  const previewClass = (index: number) =>
    showAll() ? "" : index === 1 ? "hidden sm:flex" : index === 2 ? "hidden xl:flex" : "";

  // A badge the backend ships before this build has copy for must still render.
  const label = (id: string) => {
    const key = badgeNameKey(id);
    return key ? t(key) : id;
  };
  const description = (id: string) => {
    const key = badgeDescKey(id);
    return key ? t(key) : "";
  };

  // The closest unearned rung across every tracked ladder.
  const next = createMemo(() => {
    let best: { entry: BadgeCatalogEntry; ratio: number } | null = null;
    for (const entry of props.catalog) {
      if (earnedAt().has(entry.id)) continue;
      const value = current(entry.stat);
      if (value === null) continue;
      const ratio = badgeProgressRatio(value, entry.threshold);
      if (!best || ratio > best.ratio) best = { entry, ratio };
    }
    return best;
  });

  const level = () => badgeLevel(earnedCount(), props.catalog.length);

  return (
    <section class="data-shell space-y-4 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <PixelIcon name="trophy" class="h-5 w-5 text-primary-text" />
            {t("badges.title")}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">{t("badges.subtitle")}</p>
        </div>
        <Show when={props.catalog.length > 0}>
          <div class="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
            <PixelIcon name="crown" class="h-5 w-5 text-yellow-500" />
            <div class="min-w-0">
              <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("badges.levelLabel")}</p>
              <p class="text-sm font-semibold">{t(`badges.level.${level()}`)}</p>
            </div>
            <div class="w-28">
              <span class="block h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  class="block h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${(earnedCount() / props.catalog.length) * 100}%` }}
                />
              </span>
              <p class="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
                {t("badges.earnedCount", { earned: earnedCount(), total: props.catalog.length })}
              </p>
            </div>
          </div>
        </Show>
      </div>

      <Show when={props.catalog.length > 0} fallback={<p class="text-sm text-muted-foreground">{t("badges.none")}</p>}>
        <Show
          when={next()}
          fallback={
            <div class="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-400/10 px-4 py-3 text-sm font-medium">
              <PixelIcon name="trophy" class="h-5 w-5 text-yellow-600" />
              {t("badges.allEarned")}
            </div>
          }
        >
          {(n) => (
            <div class="flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary-text">
                <PixelIcon name={statIcon(n().entry.stat)} class="h-5 w-5" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-medium uppercase tracking-wide text-primary-text">{t("badges.next")}</p>
                <p class="truncate text-sm text-muted-foreground">{description(n().entry.id) || label(n().entry.id)}</p>
              </div>
              <div class="w-40">
                <span class="block h-2 overflow-hidden rounded-full bg-primary/10">
                  <span class="block h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${n().ratio * 100}%` }} />
                </span>
                <p class="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
                  {t(n().entry.stat === "pomodoro_focus_ms" ? "badges.remainingHours" : "badges.remaining", {
                    count: badgeRemaining(n().entry.stat, current(n().entry.stat) ?? 0, n().entry.threshold),
                  })}
                </p>
              </div>
            </div>
          )}
        </Show>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <For each={visibleLadders()}>
            {(ladder, ladderIndex) => {
              const groupKey = badgeGroupKey(ladder.stat);
              const earnedInLadder = () => ladder.entries.filter((entry) => earnedAt().has(entry.id)).length;
              return (
                <article class={cn("flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3", previewClass(ladderIndex()))}>
                  <header class="flex items-center gap-2.5">
                    <span
                      class={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md",
                        earnedInLadder() > 0 ? "bg-primary/12 text-primary-text" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <PixelIcon name={statIcon(ladder.stat)} class="h-[18px] w-[18px]" />
                    </span>
                    <p class="min-w-0 flex-1 truncate text-sm font-semibold">{groupKey ? t(groupKey) : ladder.stat}</p>
                    <span class="flex gap-0.5" aria-hidden="true">
                      <For each={ladder.entries}>
                        {(entry, index) => (
                          <span
                            class={cn(
                              "h-2 w-2 rounded-[1px]",
                              earnedAt().has(entry.id)
                                ? { bronze: "bg-amber-700", silver: "bg-slate-400", gold: "bg-yellow-500" }[badgeTier(index(), ladder.entries.length)]
                                : "bg-muted-foreground/20",
                            )}
                          />
                        )}
                      </For>
                    </span>
                  </header>

                  <div class="grid gap-1.5" role="list">
                    <For each={ladder.entries}>
                      {(entry, index) => {
                        const at = () => earnedAt().get(entry.id);
                        const value = () => current(entry.stat) ?? 0;
                        const tracked = () => current(entry.stat) !== null;
                        const tier = () => badgeTier(index(), ladder.entries.length);
                        const isHours = entry.stat === "pomodoro_focus_ms";
                        // The tooltip enriches; the row itself carries every
                        // number, since a touch device can never open one.
                        const hint = () =>
                          at()
                            ? t("badges.earnedOn", { date: formatDate(at()!, prefs.locale()) })
                            : tracked()
                              ? t(isHours ? "badges.remainingHours" : "badges.remaining", {
                                  count: badgeRemaining(entry.stat, value(), entry.threshold),
                                })
                              : t("badges.locked");

                        return (
                          <Tooltip openDelay={200} closeDelay={80}>
                            <TooltipTrigger
                              as="div"
                              role="listitem"
                              tabindex="0"
                              aria-label={`${label(entry.id)} — ${hint()}`}
                              class={cn(
                                "group/rung flex items-center gap-2.5 rounded-lg border p-2 outline-hidden transition-[transform,border-color,background-color] duration-200 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring",
                                at() ? "border-transparent bg-muted/40" : "border-dashed border-border/70",
                              )}
                            >
                              <span
                                class={cn(
                                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1",
                                  at() ? TIER_MEDAL[tier()] : "bg-muted text-muted-foreground/50 ring-transparent",
                                )}
                              >
                                <PixelIcon name={at() ? "trophy" : "lock"} class="h-5 w-5 transition-transform duration-200 group-hover/rung:scale-110" />
                              </span>
                              <div class="min-w-0 flex-1">
                                <p class={cn("truncate text-[13px] font-semibold", !at() && "text-muted-foreground")}>{label(entry.id)}</p>
                                <Show
                                  when={!at() && tracked()}
                                  fallback={<p class="truncate text-[11px] tabular-nums text-muted-foreground">{hint()}</p>}
                                >
                                  <div class="flex items-center gap-2">
                                    <span class="block h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                      <span
                                        class="block h-full rounded-full bg-primary/70 transition-[width] duration-500"
                                        style={{ width: `${badgeProgressRatio(value(), entry.threshold) * 100}%` }}
                                      />
                                    </span>
                                    <span class="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                      {badgeProgressLabel(entry.stat, value())} / {badgeThresholdLabel(entry.stat, entry.threshold)}
                                    </span>
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
                </article>
              );
            }}
          </For>
        </div>
        <Show when={ladders().length > 1}>
          <div class="flex justify-center">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={showAll()}
              onClick={() => setShowAll(!showAll())}
            >
              <PixelIcon name={showAll() ? "chevron-up" : "chevron-down"} class="h-4 w-4" />
              {showAll() ? t("badges.showLess") : t("badges.showAll", { count: ladders().length })}
            </button>
          </div>
        </Show>
      </Show>
    </section>
  );
}
