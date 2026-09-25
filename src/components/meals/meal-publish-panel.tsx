import { For, Show, createSignal } from "solid-js";
import { formatApiError, type Limits, type MealSlot } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { inputDateToIso, isoDateToInput } from "@/lib/datetime-input";
import { mealSlotLabel } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

export type MealPublishInput = { date: string; slot: string; capacity: number | null };

/** Publish one menu (date + slot + optional capacity) from the list header. */
export function MealPublishPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: string;
  slots: MealSlot[];
  limits?: Limits | null;
  limitsError?: string;
  onRetryLimits: () => void;
  onPublish: (input: MealPublishInput) => Promise<void>;
}) {
  const t = useT();
  const [date, setDate] = createSignal(props.initialDate);
  const [picked, setSlot] = createSignal("");
  // Settings may land after mount: default to the school's first slot.
  const slot = () => picked() || props.slots[0]?.name || "";
  const [capacity, setCapacity] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setPending(true); setError("");
    try {
      await props.onPublish({ date: date(), slot: slot(), capacity: capacity() ? Number(capacity()) : null });
      setCapacity("");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} guardUnsaved title={t("meals.publish")} description={t("meals.publishHelp")}>
      <form class="space-y-4" onSubmit={submit}>
        <Show when={props.limitsError}><ErrorAlert message={props.limitsError!} onRetry={props.onRetryLimits} /></Show>
        <div class="space-y-1.5">
          <Label for="meal-date">{t("meals.date")}</Label>
          <DatePicker id="meal-date" required placeholder={t("form.datePlaceholder")} value={isoDateToInput(date())} onChange={(value) => setDate(inputDateToIso(value))} />
        </div>
        <div class="space-y-1.5">
          <Label for="meal-slot">{t("meals.slot")}</Label>
          <Select id="meal-slot" required value={slot()} onChange={(e) => setSlot(e.currentTarget.value)}>
            <For each={props.slots}>{(item) => <option value={item.name}>{mealSlotLabel(item.name, t)}</option>}</For>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label for="meal-capacity">{t("meals.capacity")}</Label>
          <Input id="meal-capacity" type="number" min={0} max={props.limits?.meal.max_menu_capacity} value={capacity()} onInput={(e) => setCapacity(e.currentTarget.value)} />
        </div>
        <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
        <div class="flex gap-2 border-t border-border-hairline pt-4">
          <Button type="submit" disabled={pending()}>{t("common.create")}</Button>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </SidePanel>
  );
}
