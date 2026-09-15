import { Show, Suspense, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate, useParams } from "@tanstack/solid-router";
import { getModulesCatalog } from "@/api/modules";
import {
  deleteSchoolBySlug,
  deleteSchoolModule,
  getSchoolBySlug,
  getSchoolModules,
  patchSchoolBySlug,
  patchSchoolModules,
  postSchoolModule,
} from "@/api/schools";
import { formatApiError, type SchoolStatus } from "@/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { BuilderGuard } from "@/components/builder/builder-guard";
import { BuilderHeader } from "@/components/builder/builder-header";
import { SchoolAdminAccessPanel, type AdminAccessMode } from "@/components/builder/school-admin-access-panel";
import { SchoolStatusBadge } from "@/components/builder/school-status-badge";
import { ModuleCatalogGrid } from "@/components/modules/module-catalog-grid";
import { formatModuleError } from "@/lib/module-labels";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconExternalLink, IconLock, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/stores/auth-context";
import { BuilderProvider } from "@/stores/builder-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function BuilderSchoolDetailPage() {
  return (
    <BuilderProvider>
      <BuilderGuard>
        <BuilderSchoolDetailContent />
      </BuilderGuard>
    </BuilderProvider>
  );
}

function BuilderSchoolDetailContent() {
  const t = useT();
  const { locale } = usePreferences();
  const auth = useAuth();
  const navigate = useNavigate();
  const params = useParams({ from: "/builder/schools/$slug" });
  const slug = () => params().slug;

  const [school, { refetch: refetchSchool }] = createResource(slug, (value) => getSchoolBySlug(value));
  const [catalog] = createResource(() => getModulesCatalog());
  const [modules] = createResource(slug, (value) => getSchoolModules(value));

  // The switchboard owns a local copy: each switch is one write whose response
  // is the school's whole new set, so there is nothing to refetch.
  const [enabled, setEnabled] = createSignal<string[]>([]);
  createEffect(() => {
    const value = modules();
    if (value) setEnabled(value.enabled);
  });
  const [modulesSaving, setModulesSaving] = createSignal(false);
  const [modulesError, setModulesError] = createSignal("");

  const [editOpen, setEditOpen] = createSignal(false);
  const [name, setName] = createSignal("");
  const [status, setStatus] = createSignal<SchoolStatus>("active");
  const [editError, setEditError] = createSignal("");
  const [accessMode, setAccessMode] = createSignal<AdminAccessMode | null>(null);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();

  const writeModules = async (write: () => Promise<{ enabled: string[] }>) => {
    if (modulesSaving()) return;
    setModulesSaving(true);
    setModulesError("");
    try {
      const next = await write();
      setEnabled(next.enabled);
    } catch (err) {
      // A 409 names the broken dependency; the switch stays where it was.
      setModulesError(formatModuleError(err, t));
    } finally {
      setModulesSaving(false);
    }
  };

  const openEdit = () => {
    const current = school();
    if (!current) return;
    setName(current.name);
    setStatus(current.status);
    setEditError("");
    setEditOpen(true);
  };

  const saveEdit = async (event: SubmitEvent) => {
    event.preventDefault();
    setEditError("");
    try {
      await patchSchoolBySlug(slug(), { name: name().trim(), status: status() });
      setEditOpen(false);
      await refetchSchool();
      setFlash(t("common.saved"));
    } catch (err) {
      setEditError(formatApiError(err));
    }
  };

  return (
    <div class="space-y-6">
      <BuilderHeader />
      <Suspense fallback={<PageSpinner />}>
        <Show when={school.error}>
          <ErrorAlert message={formatApiError(school.error)} onRetry={() => void refetchSchool()} />
        </Show>
        <Show when={!school.error && school()}>
          {(current) => (
            <>
              <PageHeader
                eyebrow={t("builder.schools")}
                title={current().name}
                description={`${current().slug} · ${t("builder.createdAt")}: ${formatDateTime(current().created_at, locale())}`}
                actions={
                  <div class="flex flex-wrap items-center gap-2">
                    <SchoolStatusBadge status={current().status} />
                    <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={openEdit}>
                      <IconEdit class="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setAccessMode("password")}>
                      <IconLock class="h-4 w-4" />
                      {t("builder.resetAdminPassword")}
                    </Button>
                    <Button type="button" size="sm" class="rounded-lg" disabled={current().status === "suspended"} title={current().status === "suspended" ? t("builder.enterSuspendedHint") : undefined} onClick={() => setAccessMode("enter")}>
                      <IconExternalLink class="h-4 w-4" />
                      {t("builder.enterSchool")}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" class="rounded-lg" onClick={() => setDeleteOpen(true)}>
                      <IconTrash class="h-4 w-4" />
                      {t("common.delete")}
                    </Button>
                  </div>
                }
              />
              <Show when={flash()}>
                <Alert variant="success">{flash()}</Alert>
              </Show>
              <Show when={error()}>
                <Alert variant="destructive">{error()}</Alert>
              </Show>

              <section class="space-y-3">
                <div>
                  <h2 class="font-semibold text-text-strong">{t("builder.modules")}</h2>
                  <p class="text-sm text-text-subtle">{t("builder.modulesHint")}</p>
                </div>
                <Show when={modulesError()}>
                  <Alert variant="destructive">{modulesError()}</Alert>
                </Show>
                <Show when={modules.error || catalog.error}>
                  <ErrorAlert message={formatApiError(modules.error ?? catalog.error)} />
                </Show>
                <Show when={!modules.error && !catalog.error && catalog()}>
                  {(value) => (
                    <ModuleCatalogGrid
                      catalog={value()}
                      enabled={enabled()}
                      disabled={modulesSaving()}
                      onToggle={(module, next) =>
                        void writeModules(() => (next ? postSchoolModule(slug(), module) : deleteSchoolModule(slug(), module)))
                      }
                      onTogglePackage={(pkg, next) =>
                        void writeModules(() => patchSchoolModules(slug(), next ? { enable_packages: [pkg] } : { disable_packages: [pkg] }))
                      }
                    />
                  )}
                </Show>
              </section>
            </>
          )}
        </Show>
      </Suspense>

      <SidePanel open={editOpen()} onOpenChange={setEditOpen} title={t("builder.editSchool")} description={t("builder.editSchoolHint")}>
        <form class="space-y-4" onSubmit={saveEdit}>
          <Show when={editError()}>
            <Alert variant="destructive">{editError()}</Alert>
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
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" class="h-10 rounded-lg">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <SchoolAdminAccessPanel
        slug={slug()}
        mode={accessMode()}
        onClose={() => setAccessMode(null)}
        onPasswordReset={() => {
          setAccessMode(null);
          setFlash(t("builder.passwordResetDone"));
        }}
        onEntered={async () => {
          setAccessMode(null);
          // The builder cookie is gone; this browser is now that admin.
          await auth.refresh();
          void navigate({ to: "/" });
        }}
      />

      <ConfirmDialog
        open={deleteOpen()}
        onOpenChange={setDeleteOpen}
        title={t("builder.deleteSchool")}
        description={t("builder.deleteSchoolWarning")}
        variant="destructive"
        summary={school() ? `${school()!.name} · ${school()!.slug}` : ""}
        onConfirm={async () => {
          try {
            await deleteSchoolBySlug(slug());
            void navigate({ to: "/builder" });
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setDeleteOpen(false);
          }
        }}
      />
    </div>
  );
}
