import { Show } from "solid-js";
import type { PersonRef } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

/**
 * The student/parent's main task on a menu: am I booked, and the one button
 * that books or cancels. A parent picks which child first.
 */
export function MealBookingCard(props: {
  isParent: boolean;
  children: PersonRef[];
  selectedChild: string;
  onSelectChild: (id: string) => void;
  canBook: boolean;
  booked: boolean;
  cutoffClosed: boolean;
  pending: boolean;
  onBook: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <section class="data-shell space-y-4 p-4" aria-labelledby="meal-booking-title">
      <div class="flex items-center justify-between gap-3">
        <h2 id="meal-booking-title" class="font-semibold text-text-strong">{t("meals.bookingStatus")}</h2>
        <Show when={props.canBook}>
          <Badge variant={props.booked ? "success" : "secondary"}>{props.booked ? t("meals.booked") : t("meals.notBooked")}</Badge>
        </Show>
      </div>
      <Show when={props.isParent}>
        <div class="space-y-1.5">
          <Label for="meal-child">{t("meals.child")}</Label>
          <SearchableSelect
            id="meal-child"
            value={props.selectedChild}
            onChange={props.onSelectChild}
            options={props.children.map((child) => ({ value: child.id, label: personLabel(child) }))}
          />
        </div>
      </Show>
      <Show when={props.canBook}>
        <p class="text-sm text-muted-foreground">{props.cutoffClosed ? t("meals.cutoffPassed") : t("meals.bookingHelp")}</p>
        <Show
          when={props.booked}
          fallback={<Button class="w-full" disabled={props.pending || props.cutoffClosed} onClick={props.onBook}>{t("meals.book")}</Button>}
        >
          <Button class="w-full" variant="outline" disabled={props.pending || props.cutoffClosed} onClick={props.onCancel}>
            <span class="text-destructive-text">{t("meals.cancelBooking")}</span>
          </Button>
        </Show>
      </Show>
    </section>
  );
}
