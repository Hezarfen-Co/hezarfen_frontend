import { Link } from "@tanstack/solid-router";
import type { Exam } from "@/api/types";
import { Badge } from "@/components/ui/badge";

export function ExamCard(props: { exam: Exam }) {
  return (
    <Link to="/exams/$id" params={{ id: props.exam.id }} class="group block h-full">
      <article class="surface-card relative flex h-full flex-col overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-rose-500/30">
        <div class="flex items-start justify-between gap-3 border-b border-border/50 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent p-5">
          <h3 class="font-display text-lg font-semibold leading-snug group-hover:text-primary">
            {props.exam.title}
          </h3>
          <Badge variant="outline" class="rounded-sm capitalize">
            {props.exam.kind}
          </Badge>
        </div>
        <div class="p-5">
          <p class="line-clamp-3 text-sm text-muted-foreground">
            {props.exam.description || "—"}
          </p>
        </div>
      </article>
    </Link>
  );
}
