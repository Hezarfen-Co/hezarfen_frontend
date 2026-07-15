import type { CoreAttendanceStatus } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";

export const ATTENDANCE_STATUSES: { value: CoreAttendanceStatus; key: MessageKey; detailKey: MessageKey; class: string }[] = [
  {
    value: "present",
    key: "status.present",
    detailKey: "status.presentDetail",
    class: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "absent",
    key: "status.absent",
    detailKey: "status.absentDetail",
    class: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    value: "late",
    key: "status.late",
    detailKey: "status.lateDetail",
    class: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    value: "excused",
    key: "status.excused",
    detailKey: "status.excusedDetail",
    class: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
];

export function getAttendanceStatusMeta(status: string) {
  return ATTENDANCE_STATUSES.find((item) => item.value === status);
}
