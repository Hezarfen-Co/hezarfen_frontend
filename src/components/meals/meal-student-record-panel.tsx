import { Show, createEffect, createSignal } from "solid-js";
import type { DietaryProfile, Limits } from "@/api/client";
import { MealTagCheckboxes } from "@/components/meals/meal-tag-checkboxes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { formatTry } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

export type MealCreditInput = { amountMinor: number; method?: string; note?: string };

/**
 * Manager tools for one student: their dietary profile, and for admins an
 * append-only canteen credit. Lives in a panel so the menu page stays about
 * the menu.
 */
export function MealStudentRecordPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onStudentChange: (id: string) => void;
  profile?: DietaryProfile | null;
  balanceMinor?: number;
  dietaryTags: string[];
  limits?: Limits | null;
  isAdmin: boolean;
  moneyLocale: string;
  pending: boolean;
  error: string;
  onSaveProfile: (tags: string[], note: string | null) => Promise<boolean>;
  onRecordCredit: (input: MealCreditInput) => Promise<boolean>;
}) {
  const t = useT();
  const [tags, setTags] = createSignal<string[]>([]);
  const [note, setNote] = createSignal("");
  const [amount, setAmount] = createSignal("");
  const [method, setMethod] = createSignal("");
  const [creditNote, setCreditNote] = createSignal("");
  createEffect(() => {
    const profile = props.profile;
    if (profile) { setTags([...profile.tags]); setNote(profile.note ?? ""); }
  });

  const saveProfile = (event: SubmitEvent) => {
    event.preventDefault();
    void props.onSaveProfile(tags(), note().trim() || null);
  };
  const recordCredit = async (event: SubmitEvent) => {
    event.preventDefault();
    const ok = await props.onRecordCredit({
      amountMinor: Math.round(Number(amount()) * 100),
      method: method().trim() || undefined,
      note: creditNote().trim() || undefined,
    });
    if (ok) { setAmount(""); setMethod(""); setCreditNote(""); }
  };

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("meals.studentRecord")} description={t("meals.studentRecordHelp")}>
      <div class="space-y-5">
        <UserSearchSelect id="meal-record-user" role="student" value={props.studentId} onChange={props.onStudentChange} label={t("meals.student")} />
        <Show when={props.error}><Alert variant="destructive">{props.error}</Alert></Show>
        <Show when={props.studentId} fallback={<p class="text-sm text-muted-foreground">{t("meals.selectStudentFirst")}</p>}>
          <Show when={props.balanceMinor != null}>
            <div class="flex items-baseline justify-between rounded-lg bg-surface-tint px-3 py-2">
              <span class="text-sm text-muted-foreground">{t("meals.balance")}</span>
              <span class="font-semibold tabular-nums">{formatTry(props.balanceMinor!, props.moneyLocale)}</span>
            </div>
          </Show>
          <form class="space-y-3" onSubmit={saveProfile}>
            <h3 class="text-sm font-semibold text-text-strong">{t("meals.dietaryProfile")}</h3>
            <MealTagCheckboxes tags={props.dietaryTags} selected={tags()} onChange={setTags} />
            <Textarea maxlength={props.limits?.meal.max_dietary_note_len} value={note()} placeholder={t("meals.dietaryNote")} aria-label={t("meals.dietaryNote")} onInput={(e) => setNote(e.currentTarget.value)} />
            <Button type="submit" size="sm" class="rounded-lg" disabled={props.pending}>{t("common.save")}</Button>
          </form>
          <Show when={props.isAdmin}>
            <form class="space-y-3 border-t border-border-hairline pt-5" onSubmit={recordCredit}>
              <div>
                <h3 class="text-sm font-semibold text-text-strong">{t("meals.recordCredit")}</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">{t("meals.creditAppendOnly")}</p>
              </div>
              <div class="space-y-1.5">
                <Label for="meal-credit-amount">{t("meals.amountTry")}</Label>
                <Input id="meal-credit-amount" type="number" min={0.01} step={0.01} value={amount()} onInput={(e) => setAmount(e.currentTarget.value)} />
              </div>
              <div class="space-y-1.5">
                <Label for="meal-credit-method">{t("meals.method")}</Label>
                <Input id="meal-credit-method" maxlength={props.limits?.meal.max_ledger_method_len} value={method()} onInput={(e) => setMethod(e.currentTarget.value)} />
              </div>
              <div class="space-y-1.5">
                <Label for="meal-credit-note">{t("meals.note")}</Label>
                <Textarea id="meal-credit-note" maxlength={props.limits?.meal.max_ledger_note_len} value={creditNote()} onInput={(e) => setCreditNote(e.currentTarget.value)} />
              </div>
              <Button type="submit" size="sm" class="rounded-lg" disabled={props.pending}>{t("meals.recordCredit")}</Button>
            </form>
          </Show>
        </Show>
      </div>
    </SidePanel>
  );
}
