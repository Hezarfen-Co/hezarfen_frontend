import type { ColumnDef } from "@tanstack/solid-table";
import { Show, Suspense, createMemo } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getModules, getModulesCatalog } from "@/api/modules";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconPackage } from "@/components/ui/icons";
import { moduleLabel, packageLabel } from "@/lib/module-labels";
import { useT } from "@/stores/preferences-context";

type ModuleRow = { module: string; package: string; requires: string[]; enabled: boolean };

export default function LicenseModulesPage() {
  return (
    <RouteGuard minRole="admin">
      <LicenseModulesContent />
    </RouteGuard>
  );
}

// ADM-05. What the school has is real (GET /modules over the catalog); price,
// seat count, renewal and invoices belong to a billing API that does not
// exist, so those slots say "yakında". Selling a module is the operator's
// act on /builder, never a school admin's.
function LicenseModulesContent() {
  const t = useT();
  const [data, { refetch }] = createResource(async () => {
    const [catalog, mine] = await Promise.all([getModulesCatalog(), getModules()]);
    const rows: ModuleRow[] = catalog.modules.map((entry) => ({
      module: entry.module,
      package: entry.package,
      requires: entry.requires,
      enabled: mine.enabled.includes(entry.module),
    }));
    return { rows, packages: catalog.packages };
  });

  const enabledCount = () => (data()?.rows ?? []).filter((row) => row.enabled).length;
  const totalCount = () => data()?.rows.length ?? 0;
  const isFull = () => totalCount() > 0 && enabledCount() === totalCount();
  const enabledPackages = () =>
    (data()?.packages ?? [])
      .filter((pkg) => pkg.modules.some((module) => data()?.rows.find((row) => row.module === module)?.enabled))
      .map((pkg) => packageLabel(pkg.package, t));

  const columns = createMemo<ColumnDef<ModuleRow>[]>(() => [
    {
      id: "module",
      header: t("modules.module"),
      meta: { cellClass: "max-w-0" },
      cell: (cell) => {
        const label = moduleLabel(cell.row.original.module, t);
        return (
          <span class="flex min-w-0 items-center gap-2 font-medium text-text-strong">
            <IconPackage class="h-4 w-4 shrink-0 text-text-subtle" />
            <span class="truncate" title={label}>{label}</span>
          </span>
        );
      },
    },
    // Package and prerequisites are their own columns rather than a caption
    // line under the module name, so every row stays one line tall.
    {
      id: "package",
      accessorFn: (row) => packageLabel(row.package, t),
      header: t("modules.package"),
      meta: { cellClass: "max-w-0 text-text-subtle" },
    },
    {
      id: "requires",
      accessorFn: (row) => row.requires.map((name) => moduleLabel(name, t)).join(", "),
      header: t("modules.requires"),
      enableSorting: false,
      meta: { cellClass: "max-w-0 text-text-subtle" },
      cell: (cell) => {
        const text = cell.row.original.requires.map((name) => moduleLabel(name, t)).join(", ");
        return text ? <span class="block truncate" title={text}>{text}</span> : "—";
      },
    },
    {
      id: "status",
      header: t("builder.status"),
      cell: (cell) => (
        <Badge variant={cell.row.original.enabled ? "success" : "secondary"} class="rounded-full">
          {cell.row.original.enabled ? t("modules.active") : t("modules.off")}
        </Badge>
      ),
    },
    // Unit price, seats and annual amount have no licensing/billing endpoint
    // behind them, so those design columns are left out rather than filled
    // with "yakında".
  ]);

  return (
    <div class="space-y-5">
      <Suspense fallback={<DataTableSkeleton columns={2} rows={8} />}>
        <Show when={data.error}>
          <ErrorAlert message={formatApiError(data.error)} onRetry={() => void refetch()} />
        </Show>
        <Show when={!data.error && data()}>
          {(value) => (
            <>
              <section class="data-shell space-y-4 p-5">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0 space-y-1">
                    <div class="flex items-center gap-2">
                      <h2 class="text-2xl font-semibold tracking-tight text-text-strong">
                        {isFull() ? t("modules.fullPackage") : t("modules.customPackage")}
                      </h2>
                      <Badge variant="success" class="rounded-full">{t("modules.active")}</Badge>
                    </div>
                    <p class="text-sm text-text-subtle">{enabledPackages().join(" + ") || "—"}</p>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-surface-tint" role="progressbar" aria-valuemin={0} aria-valuemax={totalCount()} aria-valuenow={enabledCount()}>
                  <div class="h-full rounded-full bg-primary" style={{ width: `${totalCount() ? (enabledCount() / totalCount()) * 100 : 0}%` }} />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span class="text-text-subtle">{t("modules.enabledCount", { on: String(enabledCount()), total: String(totalCount()) })}</span>
                </div>
              </section>

              <section class="space-y-4 p-0">
                <DataTable
                  urlState
                  title={t("nav.licenseModules")}
                  description={t("modules.subtitle")}
                  columns={columns()}
                  data={value().rows}
                  tableClass="min-w-md"
                  enablePagination={false}
                  storageKey="license-modules"
                />
              </section>
            </>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
