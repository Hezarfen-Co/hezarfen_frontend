import { Show, createEffect, createSignal, on } from "solid-js";
import type { Limits, MealDish } from "@/api/client";
import type { MealDishBody } from "@/api/meals";
import { MealTagCheckboxes } from "@/components/meals/meal-tag-checkboxes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

/** Add a dish, or edit one (`dish` set). Prices are typed in TRY, sent in minor units. */
export function MealDishPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dish: MealDish | null;
  description: string;
  dietaryTags: string[];
  limits?: Limits | null;
  pending: boolean;
  error: string;
  onSave: (body: MealDishBody) => Promise<boolean>;
}) {
  const t = useT();
  const [name, setName] = createSignal("");
  const [text, setText] = createSignal("");
  const [price, setPrice] = createSignal("");
  const [tags, setTags] = createSignal<string[]>([]);
  createEffect(on(() => [props.open, props.dish] as const, ([open, dish]) => {
    if (!open) return;
    setName(dish?.name ?? ""); setText(dish?.description ?? "");
    setPrice(dish ? String(dish.price_minor / 100) : ""); setTags(dish?.tags ?? []);
  }));
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const body = { name: name().trim(), description: text().trim() || null, price_minor: Math.round(Number(price()) * 100), tags: tags() };
    if (await props.onSave(body)) props.onOpenChange(false);
  };
  return (
    <SidePanel guardUnsaved open={props.open} onOpenChange={props.onOpenChange} title={props.dish ? t("meals.editDish") : t("meals.addDish")} description={props.description}>
      <form class="space-y-4" onSubmit={submit}>
        <div class="space-y-1.5">
          <Label for="dish-name">{t("meals.dishName")}</Label>
          <Input id="dish-name" required maxlength={props.limits?.meal.max_dish_name_len} value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </div>
        <div class="space-y-1.5">
          <Label for="dish-description">{t("form.description")}</Label>
          <Textarea id="dish-description" maxlength={props.limits?.meal.max_dish_description_len} value={text()} onInput={(e) => setText(e.currentTarget.value)} />
        </div>
        <div class="space-y-1.5">
          <Label for="dish-price">{t("meals.priceTry")}</Label>
          <Input id="dish-price" required type="number" min={0} step={0.01} value={price()} onInput={(e) => setPrice(e.currentTarget.value)} />
        </div>
        <MealTagCheckboxes tags={props.dietaryTags} selected={tags()} onChange={setTags} />
        <Show when={props.error}><Alert variant="destructive">{props.error}</Alert></Show>
        <div class="flex gap-2 border-t border-border-hairline pt-4">
          <Button type="submit" disabled={props.pending}>{t("common.save")}</Button>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </SidePanel>
  );
}
