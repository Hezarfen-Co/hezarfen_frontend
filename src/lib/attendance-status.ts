import type { CoreAttendanceStatus } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

export const ATTENDANCE_STATUSES: { value: CoreAttendanceStatus; key: MessageKey; detailKey: MessageKey; class: string }[] = [
  {
    value: "present",
    key: "status.present",
    detailKey: "status.presentDetail",
    class: "border-success/30 bg-success/10 text-success",
  },
  {
    value: "absent",
    key: "status.absent",
    detailKey: "status.absentDetail",
    class: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  {
    value: "late",
    key: "status.late",
    detailKey: "status.lateDetail",
    class: "border-warning/30 bg-warning/10 text-warning",
  },
  {
    value: "excused",
    key: "status.excused",
    detailKey: "status.excusedDetail",
    class: "border-info/30 bg-info/10 text-info",
  },
];

export function getAttendanceStatusMeta(status: string) {
  return ATTENDANCE_STATUSES.find((item) => item.value === status);
}
