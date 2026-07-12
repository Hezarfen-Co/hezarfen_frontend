import type { Role } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import { Select } from "@/components/ui/select";
import { ROLES } from "@/lib/roles";
import { useT } from "@/stores/preferences-context";

export function UserRoleSelect(props: {
  value: Role;
  disabled?: boolean;
  onChange: (role: Role) => void;
}) {
  const t = useT();
  return (
    <Select
      class="rounded-sm"
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.currentTarget.value as Role)}
      aria-label={t("admin.role")}
    >
      {ROLES.map((r) => (
        <option value={r}>{t(`role.${r}` as MessageKey)}</option>
      ))}
    </Select>
  );
}
