import { cn } from "@/lib/cn";

export function DetailField(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div class="min-w-0 space-y-1">
      <p class="text-xs font-medium text-muted-foreground">{props.label}</p>
      <p class={cn("truncate text-sm font-medium", props.mono && "mono font-normal")}>{props.value}</p>
    </div>
  );
}
