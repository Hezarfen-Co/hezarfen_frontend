import type { JSX } from "solid-js";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Form surface in a dialog. Closes only via the header X (or an in-body
 * Cancel that calls onOpenChange(false)) — backdrop/ESC are off so a
 * dismiss gesture cannot fall through onto the trigger and reopen the
 * same dialog on mobile.
 */
export function FormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: JSX.Element;
  class?: string;
}) {
  const handleOpenChange = (open: boolean) => {
    if (open) {
      props.onOpenChange(true);
      return;
    }
    // Defer the close until after the current pointer/click finishes. Otherwise
    // removing the dialog mid-gesture lets the same tap land on the trigger
    // underneath (e.g. "From bank") and the dialog pops straight back open.
    setTimeout(() => props.onOpenChange(false), 0);
  };

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent dismissable={false} class={props.class}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        <DialogBody class="side-panel-body">{props.children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
