import { type JSX, createSignal, Show } from "solid-js";
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <span
            class={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
              destructive() ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            <Show when={destructive()} fallback={<IconAlert class="h-4 w-4" />}>
              <IconTrash class="h-4 w-4" />
            </Show>
          </span>
          <div class="min-w-0 space-y-1">
            <AlertDialogTitle>{props.title}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirm.review")}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogBody>
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("confirm.summary")}
          </p>
          <div class="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm leading-relaxed">
            {props.summary}
          </div>
        </AlertDialogBody>

        <AlertDialogFooter>
          <AlertDialogCancel
            class={cn(
              "inline-flex h-11 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-background px-4 text-xs font-semibold shadow-sm tactile-press",
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
