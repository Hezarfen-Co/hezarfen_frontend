import { Show, createEffect, createSignal } from "solid-js";
import { patchSchool } from "@/api/schools";
import { formatApiError, type School, type SchoolStatus } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { useT } from "@/stores/preferences-context";

/**
 * A tenant school's edit form (name, status). One component for the builder
 * school detail header and the builder schools list's row menu, so both send
 * the same PATCH. The panel closes itself on success; the caller refetches
 * and shows its own flash in `onSaved`.
 */
export function SchoolEditPanel(props: {
  school: School | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useT();
  const [name, setName] = createSignal("");
  const [status, setStatus] = createSignal<SchoolStatus>("active");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  // Seed the form each time it opens, from the school it opens for.
  createEffect(() => {
    const current = props.school;
    if (!props.open || !current) return;
    setName(current.name);
    setStatus(current.status);
    setError("");
  });

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const current = props.school;
    if (!current || pending()) return;
    setError("");
    setPending(true);
    try {
      await patchSchool(current.id, { name: name().trim(), status: status() });
      props.onOpenChange(false);
      await props.onSaved();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel guardUnsaved open={props.open && !!props.school} onOpenChange={props.onOpenChange} title={t("builder.editSchool")} description={t("builder.editSchoolHint")}>
      <form class="space-y-4" onSubmit={submit}>
        <Show when={error()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>
        <div class="space-y-1.5">
          <Label for="school-edit-name">{t("builder.schoolName")}</Label>
          <Input id="school-edit-name" class="rounded-lg" required maxlength={120} value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </div>
        <div class="space-y-1.5">
          <Label for="school-edit-status">{t("builder.status")}</Label>
          <Select id="school-edit-status" value={status()} onChange={(e) => setStatus(e.currentTarget.value as SchoolStatus)}>
            <option value="active">{t("builder.statusActive")}</option>
            <option value="suspended">{t("builder.statusSuspended")}</option>
          </Select>
          <p class="text-xs text-text-subtle">{t("builder.suspendHint")}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => props.onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
