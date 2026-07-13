import type { Role } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/stores/preferences-context";

const VARIANT: Record<Role, "default" | "secondary" | "outline" | "destructive"> = {
  student: "secondary",
  teacher: "default",
  manager: "outline",
  admin: "destructive",
};

export function RoleBadge(props: { role: Role }) {
  const t = useT();
  return (
    <Badge variant={VARIANT[props.role]} class="rounded-sm capitalize">
      {t(`role.${props.role}` as MessageKey)}
    </Badge>
  );
}
