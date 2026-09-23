import { type JSX, createEffect, createSignal, Show } from "solid-js";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconAlert, IconTrash } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short question or action name, shown bold at the top. */
  title: string;
  /**
   * One plain sentence about what happens. Defaults to "this cannot be undone"
   * for the destructive variant and to nothing for the default variant.
   */
  description?: string;
  /** The target (item name, or a one-line recap), shown in a box under the title. */
  summary: JSX.Element | string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  /** Header glyph. Defaults to trash (destructive) / alert (default). */
  icon?: JSX.Element;
  /** Optional color treatment for a context-specific confirmation icon. */
  iconClass?: string;
  /** When set, renders an optional free-text field; its value is passed to onConfirm. */
  prompt?: { label: string; placeholder?: string; maxLength?: number; initialValue?: string; singleLine?: boolean };
  onConfirm: (prompt?: string) => void | Promise<void>;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const t = useT();
  const [pending, setPending] = createSignal(false);
  const [promptValue, setPromptValue] = createSignal("");
  const destructive = () => props.variant === "destructive";
  let cancelRef: HTMLButtonElement | undefined;

  // Reset the field each time the dialog opens so a prior entry never leaks over.
  createEffect(() => {
    if (props.open) setPromptValue(props.prompt?.initialValue ?? "");
  });

  const description = () => props.description ?? (destructive() ? t("confirm.irreversible") : undefined);
  const summaryText = () => (typeof props.summary === "string" ? props.summary : undefined);
  const hasSummary = () => (typeof props.summary === "string" ? props.summary.trim() !== "" : props.summary != null);
  const cancelLabel = () => props.cancelLabel ?? t("common.cancel");

  // While onConfirm runs the dialog stays put: Escape/outside clicks are ignored
  // so a half-finished request never loses its only visible state.
  const requestOpenChange = (open: boolean) => {
    if (!open && pending()) return;
    props.onOpenChange(open);
  };

  const run = async () => {
    if (pending()) return;
    setPending(true);
    try {
      await props.onConfirm(props.prompt ? (promptValue().trim() || undefined) : undefined);
      props.onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={props.open} onOpenChange={requestOpenChange}>
      <AlertDialogContent
        class="max-w-[440px] rounded-xl border-border-line bg-surface-base"
        onOpenAutoFocus={(e: Event) => {
          // Destructive confirmations land on Cancel so a stray Enter never
          // deletes; a prompt keeps the default (its field comes first).
          if (destructive() && !props.prompt && cancelRef) {
            e.preventDefault();
            cancelRef.focus();
          }
        }}
      >
        <div class="flex items-start gap-4 px-5 pb-5 pt-5 sm:px-6">
          <span
            aria-hidden="true"
            class={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border [&_svg]:h-5 [&_svg]:w-5",
              props.iconClass ??
                (destructive()
                  ? "border-destructive/20 bg-destructive/10 text-destructive-text"
                  : "border-primary/20 bg-primary/10 text-primary-text"),
            )}
          >
            <Show
              when={props.icon}
              fallback={
                <Show when={destructive()} fallback={<IconAlert />}>
                  <IconTrash />
                </Show>
              }
            >
              {props.icon}
            </Show>
          </span>

          <div class="min-w-0 flex-1 space-y-3 pt-0.5">
            <AlertDialogTitle class="text-base font-semibold leading-snug">{props.title}</AlertDialogTitle>

            <Show when={hasSummary()}>
              <div
                data-slot="confirm-summary"
                class="rounded-lg border border-border-line bg-muted/40 px-3 py-2 text-sm font-medium leading-relaxed text-foreground"
                title={summaryText()}
              >
                <Show when={summaryText() !== undefined} fallback={props.summary}>
                  <span class="line-clamp-3 break-words">{summaryText()}</span>
                </Show>
              </div>
            </Show>

            <Show when={description()}>
              {(text) => (
                <AlertDialogDescription class="text-[13px] leading-relaxed text-muted-foreground">
                  {text()}
                </AlertDialogDescription>
              )}
            </Show>

            <Show when={props.prompt}>
              {(prompt) => (
                <div class="space-y-1.5 pt-1">
                  <Label for="confirm-prompt">{prompt().label}</Label>
                  <Show
                    when={prompt().singleLine}
                    fallback={
                      <Textarea
                        id="confirm-prompt"
                        class="min-h-20"
                        rows={2}
                        maxlength={prompt().maxLength}
                        placeholder={prompt().placeholder}
                        value={promptValue()}
                        disabled={pending()}
                        onInput={(e) => setPromptValue(e.currentTarget.value)}
                      />
                    }
                  >
                    <Input
                      id="confirm-prompt"
                      maxlength={prompt().maxLength}
                      placeholder={prompt().placeholder}
                      value={promptValue()}
                      disabled={pending()}
                      onInput={(e) => setPromptValue(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void run();
                        }
                      }}
                    />
                  </Show>
                </div>
              )}
            </Show>
          </div>
        </div>

        <div class="flex flex-col-reverse gap-2 border-t border-border-line bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end sm:px-6">
          <AlertDialogCancel
            ref={cancelRef}
            class={cn(
              "inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-border/70 bg-background px-4 text-sm font-medium transition-colors sm:w-auto",
              "hover:border-border hover:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
            disabled={pending()}
            // Kobalte's close button defaults its accessible name to an English
            // "Dismiss", which overrides the visible text.
            aria-label={cancelLabel()}
          >
            {cancelLabel()}
          </AlertDialogCancel>
          <Button
            type="button"
            class="h-9 w-full rounded-lg px-4 font-semibold sm:w-auto sm:min-w-[7.5rem]"
            variant={destructive() ? "destructive" : "default"}
            disabled={pending()}
            aria-busy={pending()}
            onClick={() => void run()}
          >
            <Show when={pending()}>
              <span
                aria-hidden="true"
                data-slot="confirm-spinner"
                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            </Show>
            {props.confirmLabel ?? (destructive() ? t("confirm.confirmDelete") : t("confirm.confirmUpdate"))}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
