import { For, createMemo, createResource } from "solid-js";
import { getSettings } from "@/api/getSettings";
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

function statusLabel(status: string, t: (key: MessageKey) => string): string {
  const known = STATUSES.find((item) => item.value === status);
  return known ? t(known.key) : status;
}

export function AttendanceStatusPicker(props: {
  id?: string;
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  label?: string;
}) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  const statuses = createMemo(() => {
    const values = settings()?.attendance_statuses ?? STATUSES.map((item) => item.value);
    return values.includes(props.value) ? values : [props.value, ...values];
  });
  return (
    <div class="space-y-1.5">
      <Label for={props.id ?? "attendance-status"}>{props.label ?? t("events.status")}</Label>
      <Select
        id={props.id ?? "attendance-status"}
        class="rounded-sm"
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as AttendanceStatus)}
      >
        <For each={statuses()}>
          {(status) => (
            <option value={status}>{statusLabel(status, t)}</option>
          )}
        </For>
      </Select>
    </div>
  );
}
