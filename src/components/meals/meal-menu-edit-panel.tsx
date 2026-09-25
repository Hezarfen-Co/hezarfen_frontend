import { Show, createEffect, createSignal, on } from "solid-js";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { useT } from "@/stores/preferences-context";

/** Edit a menu's capacity (the one mutable menu field). Empty = unlimited. */
export function MealMenuEditPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  capacity: number | null;
  maxCapacity?: number;
  pending: boolean;
  error: string;
  onSave: (capacity: number | null) => Promise<boolean>;
}) {
  const t = useT();
  const [capacity, setCapacity] = createSignal("");
  createEffect(on(() => props.open, (open) => { if (open) setCapacity(props.capacity == null ? "" : String(props.capacity)); }));
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (await props.onSave(capacity() ? Number(capacity()) : null)) props.onOpenChange(false);
  };
  return (
    <SidePanel guardUnsaved open={props.open} onOpenChange={props.onOpenChange} title={t("meals.editMenu")} description={props.description}>
      <form class="space-y-4" onSubmit={submit}>
        <div class="space-y-1.5">
          <Label for="menu-capacity">{t("meals.capacity")}</Label>
          <Input id="menu-capacity" type="number" min={0} max={props.maxCapacity} value={capacity()} onInput={(e) => setCapacity(e.currentTarget.value)} />
        </div>
        <Show when={props.error}><Alert variant="destructive">{props.error}</Alert></Show>
        <div class="flex gap-2 border-t border-border-hairline pt-4">
          <Button type="submit" disabled={props.pending}>{t("common.save")}</Button>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </SidePanel>
  );
}
