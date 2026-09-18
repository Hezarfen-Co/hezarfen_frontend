import type { ComponentProps } from "solid-js";
import { Show, splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export type InputProps = ComponentProps<"input"> & {
  /**
   * Message shown under the field. Marks it invalid and describes it for
   * assistive tech; needs an `id` so the message can be linked.
   */
  error?: string;
};

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["class", "error"]);
  const errorId = () => (props.id ? `${props.id}-error` : undefined);
  return (
    <>
    <input
      class={cn(
        "flex h-9 w-full rounded-md border border-input bg-surface-base px-3 py-1 text-base shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-text-placeholder hover:border-ring/45 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-destructive aria-invalid:ring-destructive disabled:cursor-not-allowed disabled:bg-surface-tint disabled:text-muted-foreground disabled:opacity-70 md:text-sm",
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
