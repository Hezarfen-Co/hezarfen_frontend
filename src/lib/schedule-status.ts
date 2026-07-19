/** Shared semantic colors for exam/event schedule chips (dashboard, lists, cards). */
export type ScheduleStatus =
  | "active"
  | "upcoming"
  | "today"
  | "soon"
  | "finished"
  | "past"
  | "unscheduled";

export function scheduleStatusClass(status: ScheduleStatus | string): string {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "today" || status === "upcoming" || status === "soon") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (status === "finished" || status === "past") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "border-muted bg-muted/50 text-muted-foreground";
}

export function scheduleStatusDotClass(status: ScheduleStatus | string): string {
  if (status === "active") return "bg-emerald-600";
  if (status === "today" || status === "upcoming" || status === "soon") return "bg-amber-600";
  if (status === "finished" || status === "past") return "bg-rose-600";
  return "bg-muted-foreground";
}
