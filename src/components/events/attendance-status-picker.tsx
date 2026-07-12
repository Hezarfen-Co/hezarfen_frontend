import { For } from "solid-js";
import type { AttendanceStatus } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useT } from "@/stores/preferences-context";

const STATUSES: { value: AttendanceStatus; key: MessageKey }[] = [
  { value: "present", key: "status.present" },
  { value: "absent", key: "status.absent" },
  { value: "late", key: "status.late" },
  { value: "excused", key: "status.excused" },
];

export function AttendanceStatusPicker(props: {
  id?: string;
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  label?: string;
}) {
  const t = useT();
  return (
    <div class="space-y-1.5">
      <Label for={props.id ?? "attendance-status"}>{props.label ?? t("events.status")}</Label>
      <Select
        id={props.id ?? "attendance-status"}
        class="rounded-sm"
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as AttendanceStatus)}
      >
        <For each={STATUSES}>
          {(s) => (
            <option value={s.value}>{t(s.key)}</option>
          )}
        </For>
      </Select>
    </div>
  );
}
