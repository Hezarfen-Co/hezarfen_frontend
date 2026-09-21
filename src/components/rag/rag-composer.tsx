import { createEffect, onMount } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconSend } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

const MAX_HEIGHT_PX = 176;

export function RagComposer(props: {
  value: string;
  placeholder: string;
  sendLabel: string;
  hint: string;
  disabled: boolean;
  /** Take the caret on mount — the landing screen is the composer, so it should
   *  be ready to type into, and a send that re-places it returns focus. */
  autofocus?: boolean;
  class?: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
}) {
  let field: HTMLTextAreaElement | undefined;

  const resize = () => {
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_HEIGHT_PX)}px`;
  };

  createEffect(() => {
    void props.value;
    resize();
  });

  onMount(() => {
    if (props.autofocus) field?.focus();
  });

  return (
    <form
      class={cn("px-4 sm:px-6", props.class)}
      onSubmit={(event) => {
        event.preventDefault();
        if (!props.disabled) props.onSubmit();
      }}
    >
      <div class="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border bg-surface-overlay px-3.5 py-2.5 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring">
        <Textarea
          ref={field}
          rows={1}
          maxlength={8000}
          value={props.value}
          disabled={props.disabled}
          placeholder={props.placeholder}
          class="max-h-44 min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 text-base shadow-none hover:border-0 hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          onInput={(event) => props.onInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!props.disabled) props.onSubmit();
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          class="h-9 w-9 shrink-0 rounded-full p-0"
          aria-label={props.sendLabel}
          title={props.sendLabel}
          disabled={props.disabled || !props.value.trim()}
        >
          <IconSend class="h-4 w-4" />
        </Button>
      </div>
      {/* Enter / Shift+Enter means nothing on a touch keyboard. */}
      <p class="mx-auto mt-2 w-full max-w-3xl px-1 text-center text-[11px] leading-4 text-muted-foreground [@media(pointer:coarse)]:hidden">{props.hint}</p>
    </form>
  );
}
