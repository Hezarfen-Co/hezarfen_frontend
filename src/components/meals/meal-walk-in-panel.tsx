import { Show, createSignal } from "solid-js";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { useT } from "@/stores/preferences-context";

/** Record a student who came without a booking as served. */
export function MealWalkInPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  pending: boolean;
  error: string;
  onSubmit: (studentId: string) => Promise<boolean>;
}) {
  const t = useT();
  const [student, setStudent] = createSignal("");
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!student()) return;
    if (await props.onSubmit(student())) {
      setStudent("");
      props.onOpenChange(false);
    }
  };
  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("meals.addWalkIn")} description={props.description}>
      <form class="space-y-4" onSubmit={submit}>
        <p class="text-sm text-muted-foreground">{t("meals.walkInHelp")}</p>
        <UserSearchSelect id="meal-walkin" value={student()} onChange={setStudent} label={t("meals.student")} placeholder={t("form.selectStudent")} />
        <Show when={props.error}><Alert variant="destructive">{props.error}</Alert></Show>
        <div class="flex gap-2 border-t border-border-hairline pt-4">
          <Button type="submit" disabled={!student() || props.pending}>{t("meals.served")}</Button>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </SidePanel>
  );
}
