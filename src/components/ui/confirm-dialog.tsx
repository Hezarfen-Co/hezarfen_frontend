import { type JSX, createEffect, createSignal, Show } from "solid-js";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconAlert, IconTrash } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  summary: JSX.Element | string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  /** Header glyph. Defaults to trash (destructive) / alert (default). */
  icon?: JSX.Element;
  /** When set, renders an optional free-text field; its value is passed to onConfirm. */
  prompt?: { label: string; placeholder?: string; maxLength?: number };
  onConfirm: (prompt?: string) => void | Promise<void>;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const t = useT();
  const [pending, setPending] = createSignal(false);
  const [promptValue, setPromptValue] = createSignal("");
  const destructive = () => props.variant === "destructive";

  // Reset the field each time the dialog opens so a prior entry never leaks over.
  createEffect(() => {
    if (props.open) setPromptValue("");
  });

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
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span
            class={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
              destructive() ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            <Show when={props.icon} fallback={
              <Show when={destructive()} fallback={<IconAlert class="h-4 w-4" />}>
                <IconTrash class="h-4 w-4" />
              </Show>
            }>
              {props.icon}
            </Show>
          </span>
          <div class="min-w-0 space-y-1">
            <AlertDialogTitle>{props.title}</AlertDialogTitle>
            <AlertDialogDescription>{props.description ?? t("confirm.review")}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogBody>
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("confirm.summary")}
          </p>
          <div class="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm leading-relaxed">
            {props.summary}
          </div>
          <Show when={props.prompt}>
            {(prompt) => (
              <div class="mt-3 space-y-1.5">
                <Label for="confirm-prompt">{prompt().label}</Label>
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
              </div>
            )}
          </Show>
        </AlertDialogBody>

        <AlertDialogFooter>
          <AlertDialogCancel
            class={cn(
              "inline-flex h-11 items-center justify-center rounded-xl border border-black/8 dark:border-white/12 bg-background px-4 text-xs font-semibold shadow-xs tactile-press",
              "hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
            )}
            disabled={pending()}
          >
            {props.cancelLabel ?? t("common.cancel")}
          </AlertDialogCancel>
          <Button
            type="button"
            size="sm"
            class="h-11 rounded-xl px-5 text-xs font-semibold tactile-press"
            variant={destructive() ? "destructive" : "default"}
            disabled={pending()}
            onClick={() => void run()}
          >
            {props.confirmLabel ??
              (destructive() ? t("confirm.confirmDelete") : t("confirm.confirmUpdate"))}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
