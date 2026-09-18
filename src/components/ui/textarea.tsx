import type { ComponentProps } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export type TextareaProps = ComponentProps<"textarea"> & {
  /**
   * Message shown under the field. Marks it invalid and describes it for
   * assistive tech; needs an `id` so the message can be linked.
   */
  error?: string;
};

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ["class", "error"]);
  const errorId = () => (props.id ? `${props.id}-error` : undefined);
  return (
    <>
    <textarea
      class={cn(
        "flex min-h-15 w-full rounded-md border border-input bg-background/90 px-3 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/80 hover:border-ring/45 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-destructive aria-invalid:ring-destructive disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        local.class,
      )}
      aria-invalid={local.error ? true : undefined}
      aria-describedby={local.error ? errorId() : undefined}
      {...rest}
    />
    <Show when={local.error}>
      <p id={errorId()} class="text-xs font-medium text-destructive-text">{local.error}</p>
    </Show>
    </>
  );
}
