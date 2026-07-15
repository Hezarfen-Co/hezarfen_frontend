import { For, Show, createMemo, createResource, createSignal } from "solid-js";
import { getUserMarks } from "@/api/getUserMarks";
import { getUserSearch } from "@/api/getUserSearch";
import { ApiError, formatApiError } from "@/api/client";
import type { Page } from "@/api/page";
import type { PersonRef } from "@/api/types";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { DataTableEmpty, DataTableFrame, DataTableSkeleton } from "@/components/ui/data-table";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createDebounced } from "@/lib/debounced";
import { totalPages as pagesOf } from "@/lib/list-page";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const PAGE_SIZE = 12;
const MIN_QUERY = 2;
const emptyPage: Page<PersonRef> = { items: [], total: 0, limit: null, offset: 0 };

export default function StudentMarksPage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentMarksContent />
    </RouteGuard>
  );
}

function StudentMarksContent() {
  const t = useT();
  const [query, setQuery] = createSignal("");
  const debouncedQuery = createDebounced(query, 300);
  const [page, setPage] = createSignal(0);
  const [viewUser, setViewUser] = createSignal<PersonRef | null>(null);
  const [error, setError] = createSignal("");

  const searchKey = createMemo(() => {
    const q = debouncedQuery().trim();
    if (q.length < MIN_QUERY) return null;
    return `${q}|${page()}`;
  });

  const [list] = createResource(
    searchKey,
    async (key) => {
      try {
        const q = key.split("|")[0]!;
        return await getUserSearch(q, undefined, "student", {
          limit: PAGE_SIZE,
          offset: page() * PAGE_SIZE,
        });
      } catch (err) {
        setError(formatApiError(err));
        return emptyPage;
      }
    },
    { initialValue: emptyPage },
  );

  const [report, { refetch: refetchReport }] = createResource(
    () => viewUser()?.id ?? null,
    async (id) => {
      if (!id) return null;
      try {
        return await getUserMarks(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError(t("common.notFound"));
          return null;
        }
        setError(formatApiError(err));
        return null;
      }
    },
  );

  const total = () => list().total;
  const rows = () => list().items;
  const totalPages = createMemo(() => pagesOf(total(), PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const canSearch = () => debouncedQuery().trim().length >= MIN_QUERY;
  const listLoading = () => canSearch() && list.loading;

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.admin")}</span>
          <span>/</span>
          <span>{t("nav.studentMarks")}</span>
        </div>
        <PageHeader accent="violet" eyebrow={t("nav.admin")} title={t("nav.studentMarks")} description={t("marks.lookup")} />
      </div>

      <section class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("nav.studentMarks")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {canSearch() ? `${rows().length} / ${total()}` : t("lookup.searchHint")}
            </p>
          </div>
        </div>

        <DataToolbar
          searchValue={query()}
          searchPlaceholder={t("common.searchPlaceholder")}
          onSearchInput={(value) => {
            setError("");
            setQuery(value);
            setPage(0);
          }}
        />

        <Show when={error() && !viewUser()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={canSearch()} fallback={<DataTableEmpty>{t("lookup.searchHint")}</DataTableEmpty>}>
          <Show when={!listLoading()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
            <Show when={rows().length > 0} fallback={<DataTableEmpty>{t("form.noStudents")}</DataTableEmpty>}>
              <DataTableFrame>
                <Table class="data-table min-w-[36rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.username")}</TableHead>
                      <TableHead>{t("profile.name")}</TableHead>
                      <TableHead>{t("admin.id")}</TableHead>
                      <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <For each={rows()}>
                      {(user) => (
                        <TableRow>
                          <TableCell class="font-medium">{user.username}</TableCell>
                          <TableCell class="text-muted-foreground">{user.display_name || "—"}</TableCell>
                          <TableCell class="mono text-xs text-muted-foreground">{user.id}</TableCell>
                          <TableCell>
                            <TableRowActions
                              label={t("common.actions")}
                              actions={[
                                {
                                  label: t("common.view"),
                                  icon: <IconEye class="h-4 w-4" />,
                                  onSelect: () => {
                                    setError("");
                                    setViewUser(user);
                                  },
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </For>
                  </TableBody>
                </Table>
              </DataTableFrame>
              <Show when={total() > PAGE_SIZE}>
                <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
              </Show>
            </Show>
          </Show>
        </Show>
      </section>

      <SidePanel
        size="wide"
        open={viewUser() != null}
        onOpenChange={(open) => {
          if (!open) {
            setViewUser(null);
            setError("");
          }
        }}
        title={t("marks.forUser", { user: personLabel(viewUser()) })}
        description={t("marks.lookup")}
      >
        <div class="min-w-0 space-y-3">
          <Show when={error()}>
            <ErrorAlert message={error()} onRetry={() => void refetchReport()} />
          </Show>
          <Show when={report.loading}>
            <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
          </Show>
          <Show when={report()}>{(r) => <MarksReportView report={r()} compact />}</Show>
        </div>
      </SidePanel>
    </div>
  );
}
