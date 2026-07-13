import { Badge } from "@/components/ui/badge";
import { useT } from "@/stores/preferences-context";

export function ExamResultBadge(props: { mark?: number | null; notGraded?: boolean }) {
  const t = useT();
  if (props.notGraded || props.mark == null) {
    return (
      <Badge variant="outline" class="rounded-sm px-3 py-1 text-sm">
        {t("exams.notGraded")}
      </Badge>
    );
  }
  const mark = props.mark;
  const variant = mark >= 70 ? "default" : mark >= 50 ? "secondary" : "destructive";
  return (
    <Badge variant={variant} class="rounded-sm px-3 py-1 text-base font-semibold">
      {mark}/100
    </Badge>
  );
}
