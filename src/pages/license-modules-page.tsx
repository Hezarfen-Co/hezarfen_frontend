import { Show, Suspense, createResource } from "solid-js";
import { getModules, getModulesCatalog } from "@/api/modules";
import { formatApiError } from "@/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { ModuleCatalogGrid } from "@/components/modules/module-catalog-grid";
import { Alert } from "@/components/ui/alert";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

export default function LicenseModulesPage() {
  return (
    <RouteGuard minRole="admin">
      <LicenseModulesContent />
    </RouteGuard>
  );
}

// Read-only: a school sees what it bought. Selling a module is the operator's
// act on the builder surface (/builder), never a school admin's.
function LicenseModulesContent() {
  const t = useT();
  const [data, { refetch }] = createResource(async () => {
    const [catalog, mine] = await Promise.all([getModulesCatalog(), getModules()]);
    return { catalog, enabled: mine.enabled };
  });

  return (
    <div class="space-y-6">
      <PageHeader eyebrow={t("nav.group.institution")} title={t("nav.licenseModules")} description={t("modules.subtitle")} />
      <Alert variant="info">{t("modules.readOnlyHint")}</Alert>
      <Suspense fallback={<PageSpinner />}>
        <Show when={data.error}>
          <ErrorAlert message={formatApiError(data.error)} onRetry={() => void refetch()} />
        </Show>
        <Show when={!data.error && data()}>
          {(value) => <ModuleCatalogGrid catalog={value().catalog} enabled={value().enabled} />}
        </Show>
      </Suspense>
    </div>
  );
}
