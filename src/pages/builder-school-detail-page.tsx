import { Show, Suspense, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate, useParams } from "@tanstack/solid-router";
import { getModulesCatalog } from "@/api/modules";
import {
  deleteSchool,
  deleteSchoolModule,
  getSchool,
  getSchoolModules,
  patchSchoolModules,
  postSchoolModule,
} from "@/api/schools";
import { formatApiError } from "@/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { BuilderGuard } from "@/components/builder/builder-guard";
import { BuilderHeader } from "@/components/builder/builder-header";
import { SchoolAdminAccessPanel, type AdminAccessMode } from "@/components/builder/school-admin-access-panel";
import { SchoolEditPanel } from "@/components/builder/school-edit-panel";
import { SchoolStatusBadge } from "@/components/builder/school-status-badge";
import { ModuleCatalogGrid } from "@/components/modules/module-catalog-grid";
import { formatModuleError } from "@/lib/module-labels";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconExternalLink, IconLock, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/stores/auth-context";
import { BuilderProvider } from "@/stores/builder-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { TableRowActions } from "@/components/ui/table-row-actions";

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
  const params = useParams({ from: "/builder/schools/$id" });
  const id = () => params().id;

  const [school, { refetch: refetchSchool }] = createResource(id, (value) => getSchool(value));
  const [catalog] = createResource(() => getModulesCatalog());
  const [modules] = createResource(id, (value) => getSchoolModules(value));

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
    if (school()) setEditOpen(true);
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
                description={`${current().id} · ${t("builder.createdAt")}: ${formatDateTime(current().created_at, locale())}`}
                actions={
                  // One pill height for every header control: the buttons and
                  // the row-actions trigger (h-8 on its own) sit in one row.
                  <div class="flex flex-wrap items-center gap-2 [&_button]:h-10 [&_button]:rounded-full [&_button]:px-3.5 [&_button]:text-[13px] sm:[&_button]:h-8 touch:[&_button]:h-10">
                    <SchoolStatusBadge status={current().status} />
                    <Button type="button" variant="outline" size="sm" onClick={openEdit}>
                      <IconEdit class="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setAccessMode("password")}>
                      <IconLock class="h-4 w-4" />
                      {t("builder.resetAdminPassword")}
                    </Button>
                    <Button type="button" size="sm" disabled={current().status === "suspended"} title={current().status === "suspended" ? t("builder.enterSuspendedHint") : undefined} onClick={() => setAccessMode("enter")}>
                      <IconExternalLink class="h-4 w-4" />
                      {t("builder.enterSchool")}
                    </Button>
                    <TableRowActions
                      label={t("common.actions")}
                      actions={[{
                        label: t("common.delete"),
                        icon: <IconTrash class="h-4 w-4" />,
                        destructive: true,
                        onSelect: () => setDeleteOpen(true),
                      }]}
                    />
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
                        void writeModules(() => (next ? postSchoolModule(id(), module) : deleteSchoolModule(id(), module)))
                      }
                      onTogglePackage={(pkg, next) =>
                        void writeModules(() => patchSchoolModules(id(), next ? { enable_packages: [pkg] } : { disable_packages: [pkg] }))
                      }
                    />
                  )}
                </Show>
              </section>
            </>
          )}
        </Show>
      </Suspense>

      <SchoolEditPanel
        school={school() ?? null}
        open={editOpen()}
        onOpenChange={setEditOpen}
        onSaved={async () => {
          await refetchSchool();
          setFlash(t("common.saved"));
        }}
      />

      <SchoolAdminAccessPanel
        id={id()}
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
        summary={school() ? `${school()!.name} · ${school()!.id}` : ""}
        onConfirm={async () => {
          try {
            await deleteSchool(id());
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
