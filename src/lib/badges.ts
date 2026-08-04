import type { BadgeStat, ProfileStats } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

// The backend hands back badge ids and nothing else — the label and the icon
// behind one live here, exactly as they do for a role or a course kind. A
// badge shipped by the backend before this file has copy for it must still
// render, so every lookup falls back rather than throwing.
const KNOWN_BADGE_IDS = new Set([
  "homework_submitted_1",
  "homework_submitted_10",
  "homework_submitted_50",
  "homework_on_time_10",
  "homework_on_time_25",
  "exam_sat_1",
  "exam_sat_10",
  "exam_sat_25",
  "pomodoro_finished_10",
  "pomodoro_finished_50",
  "pomodoro_finished_200",
  "pomodoro_focus_ms_36000000",
  "pomodoro_focus_ms_180000000",
]);

// Which lifetime counter on the profile's stats block a badge's stat reads.
const STAT_TOTAL_FIELD: Record<BadgeStat, keyof ProfileStats> = {
  homework_submitted: "homework_submitted_total",
  homework_on_time: "homework_on_time_total",
  exam_sat: "exam_sat_total",
  pomodoro_finished: "pomodoro_finished_total",
  pomodoro_focus_ms: "pomodoro_focus_ms_total",
};

export function badgeNameKey(id: string): MessageKey | null {
  return KNOWN_BADGE_IDS.has(id) ? (`badge.${id}.name` as MessageKey) : null;
}

export function badgeDescKey(id: string): MessageKey | null {
  return KNOWN_BADGE_IDS.has(id) ? (`badge.${id}.desc` as MessageKey) : null;
}

/** Where the person stands on the counter this badge reads, or null if unknown. */
export function badgeProgress(stat: string, stats: ProfileStats): number | null {
  const field = STAT_TOTAL_FIELD[stat as BadgeStat];
  return field ? stats[field] : null;
}

/**
 * Focus-time badges count milliseconds, which no one reads as a number. Every
 * other stat is already a plain count.
 */
export function badgeProgressLabel(stat: string, value: number): string {
  if (stat === "pomodoro_focus_ms") return `${Math.floor(value / 3_600_000)}`;
  return `${value}`;
}

export function badgeThresholdLabel(stat: string, threshold: number): string {
  return badgeProgressLabel(stat, threshold);
}

/** How much of the threshold is done, 0..1 — drives the progress bar's width. */
export function badgeProgressRatio(current: number, threshold: number): number {
  if (threshold <= 0) return 1;
  return Math.min(1, Math.max(0, current / threshold));
}

/**
 * What is left to earn it, in the same unit the labels use (hours for focus
 * time, plain counts otherwise). Never negative — a permanent award whose
 * counter later fell back still reads as done.
 */
export function badgeRemaining(stat: string, current: number, threshold: number): number {
  if (stat === "pomodoro_focus_ms") {
    return Math.max(0, Math.ceil((threshold - current) / 3_600_000));
  }
  return Math.max(0, threshold - current);
}
