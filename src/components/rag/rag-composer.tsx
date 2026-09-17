import { createEffect } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconSend } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/textarea";

const MAX_HEIGHT_PX = 176;

export function RagComposer(props: {
  value: string;
  placeholder: string;
  sendLabel: string;
  hint: string;
  disabled: boolean;
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

  return (
    <form
      class="border-t border-border/70 bg-surface-base px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!props.disabled) props.onSubmit();
      }}
    >
      <div class="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring">
        <Textarea
          ref={field}
          rows={1}
          maxlength={8000}
          value={props.value}
          disabled={props.disabled}
          placeholder={props.placeholder}
          class="max-h-44 min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 shadow-none hover:border-0 hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
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
          class="h-8 w-8 shrink-0 rounded-full p-0"
          aria-label={props.sendLabel}
          title={props.sendLabel}
          disabled={props.disabled || !props.value.trim()}
        >
          <IconSend class="h-4 w-4" />
        </Button>
      </div>
      <p class="mt-1.5 px-1 text-[11px] leading-4 text-muted-foreground">{props.hint}</p>
    </form>
  );
}
