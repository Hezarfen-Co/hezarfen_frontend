import { For, Show, createMemo, createResource, createSignal } from "solid-js";
import { getUserSearch } from "@/api/getUserSearch";
import type { Role } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export function UserSearchSelect(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  role?: Role;
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  allowManualValue?: boolean;
}) {
  const t = useT();
  const [query, setQuery] = createSignal("");
  const search = createMemo(() => {
    const q = query().trim();
    if (q.length < 2) return null;
    return { q, role: props.role };
  });
  const [users] = createResource(search, async (source) => {
    if (!source) return [];
    return getUserSearch(source.q, source.role);
  });
  const options = createMemo(() => {
    const excluded = new Set(props.excludeIds ?? []);
    return (users() ?? []).filter((user) => !excluded.has(user.id));
  });
  const hasManualValue = createMemo(() => {
    const value = props.value.trim();
    return props.allowManualValue && value.length > 0 && !options().some((user) => user.id === value);
  });
  const hint = () => {
    if (query().trim().length < 2) return t("common.searchPlaceholder");
    if (users.loading) return t("common.loading");
    if (hasManualValue()) return props.value;
    if (options().length === 0) return t("form.noStudents");
    return props.placeholder ?? t("form.selectStudent");
  };

  return (
    <div class="space-y-2">
      <Show when={props.label}>
        {(label) => <Label for={`${props.id}-query`}>{label()}</Label>}
      </Show>
      <Input
        id={`${props.id}-query`}
        class="h-10"
        value={query()}
        disabled={props.disabled}
        placeholder={props.placeholder ?? t("common.searchPlaceholder")}
        onInput={(e) => {
          const value = e.currentTarget.value;
          setQuery(value);
          props.onChange(props.allowManualValue ? value.trim() : "");
        }}
      />
      <Select
        id={props.id}
        class="h-10 rounded-md bg-background text-foreground"
        value={props.value}
        disabled={props.disabled || (!hasManualValue() && options().length === 0)}
        onChange={(e) => props.onChange(e.currentTarget.value)}
      >
        <option value="">{hint()}</option>
        <Show when={hasManualValue()}>
          <option value={props.value}>{props.value}</option>
        </Show>
        <For each={options()}>
          {(user) => <option value={user.id}>{personLabelWithId(user)}</option>}
        </For>
      </Select>
    </div>
  );
}
