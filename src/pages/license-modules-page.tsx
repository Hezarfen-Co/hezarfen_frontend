import type { ColumnDef } from "@tanstack/solid-table";
import { For, Show, Suspense, createMemo } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getModules, getModulesCatalog } from "@/api/modules";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge, ComingSoonPanel, ComingSoonValue } from "@/components/ui/coming-soon";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconDownload, IconPackage, IconPlus } from "@/components/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      cell: (cell) => (
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-tint text-text-subtle">
            <IconPackage class="h-4 w-4" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-text-strong">{moduleLabel(cell.row.original.module, t)}</p>
            <p class="truncate text-xs text-text-subtle">
              {packageLabel(cell.row.original.package, t)}
              <Show when={cell.row.original.requires.length > 0}>
                {` · ${t("modules.requires")}: ${cell.row.original.requires.map((name) => moduleLabel(name, t)).join(", ")}`}
              </Show>
            </p>
          </div>
        </div>
      ),
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
    { id: "unitPrice", header: t("modules.unitPrice"), meta: { align: "right", hideInCards: true }, enableSorting: false, cell: () => <ComingSoonValue /> },
    { id: "seats", header: t("modules.activeSeats"), meta: { align: "right", hideInCards: true }, enableSorting: false, cell: () => <ComingSoonValue /> },
    { id: "annual", header: t("modules.annualAmount"), meta: { align: "right", hideInCards: true }, enableSorting: false, cell: () => <ComingSoonValue /> },
  ]);

  return (
    <div class="space-y-5">
      <Tabs value="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("modules.tabOverview")}</TabsTrigger>
          <For each={["modules.tabUsage", "modules.tabInvoices", "modules.tabContract"] as const}>
            {(key) => (
              <TabsTrigger value={key} disabled title={t("comingSoon.title")}>
                {t(key)}
                <ComingSoonBadge class="ml-1.5" />
              </TabsTrigger>
            )}
          </For>
        </TabsList>
      </Tabs>

      <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
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
                  <div class="text-right">
                    <ComingSoonValue class="justify-end" />
                    <p class="mt-1 text-xs text-text-subtle">{t("modules.annualTotal")}</p>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-surface-tint" role="progressbar" aria-valuemin={0} aria-valuemax={totalCount()} aria-valuenow={enabledCount()}>
                  <div class="h-full rounded-full bg-primary" style={{ width: `${totalCount() ? (enabledCount() / totalCount()) * 100 : 0}%` }} />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span class="text-text-subtle">{t("modules.enabledCount", { on: String(enabledCount()), total: String(totalCount()) })}</span>
                  <span class="flex items-center gap-2 text-text-default">
                    {t("modules.renewal")}: <ComingSoonValue />
                  </span>
                </div>
              </section>

              <section class="space-y-4 p-0">
                <DataTable
                  title={t("nav.licenseModules")}
                  description={t("modules.subtitle")}
                  actions={<><Button size="sm" variant="outline" class="min-w-[7.5rem] rounded-lg" disabled title={t("comingSoon.title")}>
            <IconDownload class="h-4 w-4" />
            {t("modules.downloadInvoices")}
            <ComingSoonBadge class="ml-1.5" />
          </Button>
          <Button size="sm" class="min-w-[7.5rem] rounded-lg" disabled title={t("modules.readOnlyHint")}>
            <IconPlus class="h-4 w-4" />
            {t("modules.addLicense")}
            <ComingSoonBadge class="ml-1.5" />
          </Button></>}
                  columns={columns()}
                  data={value().rows}
                  tableClass="min-w-[760px]"
                  enablePagination={false}
                  storageKey="license-modules"
                />
              </section>

              <ComingSoonPanel title={t("modules.recentInvoices")} />
            </>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
