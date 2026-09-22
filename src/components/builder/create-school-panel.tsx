import { Show, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getModulesCatalog } from "@/api/modules";
import { getLimits } from "@/api/limits";
import { postSchool } from "@/api/schools";
import type { School } from "@/api/client";
import { ModuleCatalogGrid } from "@/components/modules/module-catalog-grid";
import { formatModuleError } from "@/lib/module-labels";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { useT } from "@/stores/preferences-context";

/** Creates a school with its first admin and, optionally, a hand-picked module set. */
export function CreateSchoolPanel(props: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (school: School) => void }) {
  const t = useT();
  const [catalog] = createResource(() => props.open || undefined, () => getModulesCatalog());
  const [limits] = createResource(
    () => props.open || undefined,
    () => getLimits().catch(() => null),
  );
  const [name, setName] = createSignal("");
  const [adminUsername, setAdminUsername] = createSignal("");
  const [adminPassword, setAdminPassword] = createSignal("");
  const [everything, setEverything] = createSignal(true);
  const [picked, setPicked] = createSignal<string[]>([]);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const reset = () => {
    setName("");
    setAdminUsername("");
    setAdminPassword("");
    setEverything(true);
    setPicked([]);
    setError("");
  };

  const packageModules = (pkg: string) => catalog()?.packages.find((entry) => entry.package === pkg)?.modules ?? [];

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const school = await postSchool({
        name: name().trim(),
        admin_username: adminUsername().trim(),
        admin_password: adminPassword(),
        // Omitted sells the whole catalog; an explicit list is checked for
        // missing dependencies before anything is created (409).
        modules: everything() ? undefined : picked(),
      });
      reset();
      props.onCreated(school);
    } catch (err) {
      setError(formatModuleError(err, t));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel guardUnsaved
      size="wide"
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open);
        if (!open) reset();
      }}
      title={t("builder.createSchool")}
      description={t("builder.createSchoolHint")}
    >
      <form class="space-y-4" onSubmit={submit}>
        <Show when={error()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="school-name">{t("builder.schoolName")}</Label>
            <Input id="school-name" class="rounded-lg" required maxlength={limits()?.user.max_school_name_len ?? 120} value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="school-admin-username">{t("builder.adminUsername")}</Label>
            <Input id="school-admin-username" class="rounded-lg" required minlength={limits()?.user.min_username_len ?? 3} maxlength={limits()?.user.max_username_len ?? 32} autocomplete="off" value={adminUsername()} onInput={(e) => setAdminUsername(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="school-admin-password">{t("builder.adminPassword")}</Label>
            <Input id="school-admin-password" class="rounded-lg" type="password" required minlength={limits()?.user.min_password_len ?? 6} maxlength={limits()?.user.max_password_len ?? 128} autocomplete="new-password" value={adminPassword()} onInput={(e) => setAdminPassword(e.currentTarget.value)} />
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={everything()} onChange={(e) => setEverything(e.currentTarget.checked)} />
          {t("builder.sellEverything")}
        </label>
        <Show when={!everything() && catalog()}>
          {(value) => (
            <ModuleCatalogGrid
              stacked
              catalog={value()}
              enabled={picked()}
              onToggle={(module, next) => setPicked((current) => (next ? [...current, module] : current.filter((name) => name !== module)))}
              onTogglePackage={(pkg, next) =>
                setPicked((current) => {
                  const modules = packageModules(pkg);
                  return next ? [...new Set([...current, ...modules])] : current.filter((name) => !modules.includes(name));
                })
              }
            />
          )}
        </Show>
        <div class="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => props.onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
            {t("common.create")}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
