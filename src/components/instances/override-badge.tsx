import { Badge } from "@/components/ui/badge";
import { useT } from "@/stores/preferences-context";

/** Whether a resolved value is the section's own override or inherited. */
export function OverrideBadge(props: { own: boolean }) {
  const t = useT();
  return (
    <Badge variant={props.own ? "info" : "outline"} class="shrink-0 rounded-md text-[11px] font-medium">
      {props.own ? t("override.own") : t("override.inherited")}
    </Badge>
  );
}
