import { For } from "solid-js";
import type { ParentProps } from "solid-js";
import { cn } from "@/lib/cn";

export function DataTableFrame(props: ParentProps<{ class?: string }>) {
  return <div class={cn("data-table-wrap", props.class)}>{props.children}</div>;
}

export function DataTableEmpty(props: ParentProps<{ class?: string }>) {
  return (
    <div class={cn("rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-sm leading-6 text-muted-foreground", props.class)}>
      {props.children}
    </div>
  );
}

export function DataTableSkeleton(props: { rows?: number; columns?: number }) {
  const rows = () => Array.from({ length: props.rows ?? 6 });
  const columns = () => Array.from({ length: props.columns ?? 5 });
  return (
    <DataTableFrame>
      <table class="data-table">
        <tbody>
          <For each={rows()}>
            {() => (
              <tr>
                <For each={columns()}>
                  {() => (
                    <td>
                      <div class="h-3 w-full max-w-32 animate-pulse rounded-sm bg-muted" />
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </DataTableFrame>
  );
}
