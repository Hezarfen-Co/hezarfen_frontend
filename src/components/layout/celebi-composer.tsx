import { createEffect } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconSend } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

/** Six rows of the field's own line-height, after which the draft scrolls. */
const MAX_HEIGHT_PX = 160;

export function CelebiComposer(props: {
  value: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const t = useT();
  let field: HTMLTextAreaElement | undefined;

  // The field opens one row tall and follows its content up to MAX_HEIGHT_PX.
  // Height is reset to "auto" first so scrollHeight reports the content's real
  // size — that is what lets the field shrink back after a send clears it.
  const resize = () => {
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_HEIGHT_PX)}px`;
  };

  createEffect(() => {
    void props.value;
    resize();
  });

  const submit = () => {
    if (props.disabled) return;
    props.onSubmit();
  };

  return (
    <form
      class="sticky bottom-0 -mx-5 bg-gradient-to-t from-background via-background to-transparent px-5 pb-1 pt-3 sm:-mx-6 sm:px-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div class="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/25">
        <Textarea
          ref={field}
          rows={1}
          class="max-h-40 min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 shadow-none hover:border-0 hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          value={props.value}
          placeholder={t("ai.placeholder")}
          onInput={(event) => props.onInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter keeps the newline a multi-line draft needs.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          aria-label={t("ai.send")}
          title={t("ai.send")}
          class="h-8 w-8 shrink-0 rounded-full p-0"
          disabled={props.disabled}
        >
          <IconSend class="h-4 w-4" />
        </Button>
      </div>
      <p class="mt-1.5 px-1 text-[11px] leading-4 text-muted-foreground">{t("ai.hint")}</p>
    </form>
  );
}
