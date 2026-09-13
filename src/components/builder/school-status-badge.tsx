import type { SchoolStatus } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/stores/preferences-context";

export function SchoolStatusBadge(props: { status: SchoolStatus }) {
  const t = useT();
  return (
    <Badge variant={props.status === "active" ? "success" : "warning"} class="rounded-full">
      {props.status === "active" ? t("builder.statusActive") : t("builder.statusSuspended")}
    </Badge>
  );
}
