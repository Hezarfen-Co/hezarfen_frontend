import { For, createMemo, createResource } from "solid-js";
import { getSettings } from "@/api/getSettings";
import type { AttendanceStatus } from "@/api/types";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ATTENDANCE_STATUSES, getAttendanceStatusMeta } from "@/lib/attendance-status";
import { useT } from "@/stores/preferences-context";

export function AttendanceStatusPicker(props: {
  id?: string;
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  label?: string;
}) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  const statuses = createMemo(() => {
    const values = settings()?.attendance_statuses ?? ATTENDANCE_STATUSES.map((item) => item.value);
    return values.includes(props.value) ? values : [props.value, ...values];
  });
  const selectedMeta = createMemo(() => getAttendanceStatusMeta(props.value));
  return (
    <div class="space-y-1.5">
      <Label for={props.id ?? "attendance-status"}>{props.label ?? t("events.status")}</Label>
      <Select
        id={props.id ?? "attendance-status"}
        class="rounded-lg bg-background/80"
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as AttendanceStatus)}
      >
        <For each={statuses()}>
          {(status) => {
            const meta = getAttendanceStatusMeta(status);
            return <option value={status}>{meta ? `${t(meta.key)} - ${t(meta.detailKey)}` : status}</option>;
          }}
        </For>
      </Select>
      <p class="text-xs text-muted-foreground">
        {selectedMeta() ? `${t(selectedMeta()!.key)}: ${t(selectedMeta()!.detailKey)}` : props.value}
      </p>
    </div>
  );
}
