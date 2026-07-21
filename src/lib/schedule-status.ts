/** Shared semantic colors for exam/event schedule chips (dashboard, lists, cards). */
export type ScheduleStatus =
  | "active"
  | "upcoming"
  | "today"
  | "soon"
  | "finished"
  | "past"
  | "unscheduled"
  | "submitted";

export function scheduleStatusClass(status: ScheduleStatus | string): string {
  if (status === "active") {
    return "border-info/30 bg-info/10 text-info";
  }
  if (status === "submitted") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (status === "today" || status === "upcoming" || status === "soon") {
    return "border-warning/30 bg-warning/10 text-warning";
  }
  if (status === "finished" || status === "past") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-muted bg-muted/50 text-muted-foreground";
}

export function scheduleStatusDotClass(status: ScheduleStatus | string): string {
  if (status === "active") return "bg-info";
  if (status === "submitted") return "bg-success";
  if (status === "today" || status === "upcoming" || status === "soon") return "bg-warning";
  if (status === "finished" || status === "past") return "bg-destructive";
  return "bg-muted-foreground";
}
