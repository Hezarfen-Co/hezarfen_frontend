import { AlertDialog } from "@kobalte/core/alert-dialog";
import { type JSX, createSignal, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconAlert, IconTrash } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary: JSX.Element | string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const t = useT();
  const [pending, setPending] = createSignal(false);
  const destructive = () => props.variant === "destructive";

  const run = async () => {
    if (pending()) return;
    setPending(true);
    try {
      await props.onConfirm();
      props.onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/40 dark:bg-black/60" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <AlertDialog.Content
            class={cn(
              "w-full max-w-md rounded-sm border border-border bg-popover text-popover-foreground shadow-md outline-none",
              "animate-fade-up",
            )}
          >
            <div class="flex gap-3 border-b border-border px-5 py-4">
              <span
                class={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm",
                  destructive()
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Show when={destructive()} fallback={<IconAlert class="h-4 w-4" />}>
                  <IconTrash class="h-4 w-4" />
                </Show>
              </span>
              <div class="min-w-0 space-y-1">
                <AlertDialog.Title class="text-base font-semibold leading-none">
                  {props.title}
                </AlertDialog.Title>
                <AlertDialog.Description class="text-sm text-muted-foreground">
                  {t("confirm.review")}
                </AlertDialog.Description>
              </div>
            </div>

            <div class="space-y-2 px-5 py-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("confirm.summary")}
              </p>
              <div class="rounded-sm border border-border bg-muted/40 px-3 py-3 text-sm leading-relaxed">
                {props.summary}
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <AlertDialog.CloseButton
                class={cn(
                  "inline-flex h-8 items-center justify-center rounded-sm border border-input bg-background px-3 text-xs font-medium shadow-sm",
                  "hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
                )}
                disabled={pending()}
              >
                {props.cancelLabel ?? t("common.cancel")}
              </AlertDialog.CloseButton>
              <Button
                type="button"
                size="sm"
                variant={destructive() ? "destructive" : "default"}
                disabled={pending()}
                onClick={() => void run()}
              >
                {props.confirmLabel ??
                  (destructive() ? t("confirm.confirmDelete") : t("confirm.confirmUpdate"))}
              </Button>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
