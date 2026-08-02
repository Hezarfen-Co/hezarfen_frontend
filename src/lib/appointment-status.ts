/** Shared semantic colors for appointment status chips, mirroring schedule-status. */
import type { AppointmentStatus } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

export function appointmentStatusClass(status: AppointmentStatus | string): string {
  if (status === "pending") return "border-warning/30 bg-warning/10 text-warning";
  if (status === "approved") return "border-success/30 bg-success/10 text-success";
  if (status === "rejected") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-muted bg-muted/50 text-muted-foreground";
}

export function appointmentStatusDotClass(status: AppointmentStatus | string): string {
  if (status === "pending") return "bg-warning";
  if (status === "approved") return "bg-success";
  if (status === "rejected") return "bg-destructive";
  return "bg-muted-foreground";
}

export function appointmentStatusLabelKey(status: AppointmentStatus): MessageKey {
  return `appointments.status.${status}` as MessageKey;
}
