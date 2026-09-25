import { For } from "solid-js";
import { Select } from "@/components/ui/select";
import { gradeLevelLabel, gradeLevels } from "@/lib/grade-level";
import { useT } from "@/stores/preferences-context";

/**
 * A pick on the grade ladder (0 = anaokulu .. 12). `value` null shows the
 * placeholder row — the ladder is required on a class, so a form checks it.
 */
export function GradeLevelSelect(props: {
  id: string;
  value: number | null;
  onChange: (level: number | null) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  error?: boolean;
}) {
  const t = useT();
  return (
    <Select
      id={props.id}
      value={props.value === null ? "" : String(props.value)}
      disabled={props.disabled}
      aria-invalid={props.error || undefined}
      onChange={(e) => {
        const raw = e.currentTarget.value;
        props.onChange(raw === "" ? null : Number(raw));
      }}
    >
      <option value="">{t("grade.select")}</option>
      <For each={gradeLevels(props.min, props.max)}>{(level) => <option value={String(level)}>{gradeLevelLabel(level, t)}</option>}</For>
    </Select>
  );
}
