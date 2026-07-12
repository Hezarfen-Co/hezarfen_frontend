import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getMyMarks } from "@/api/getMyMarks";
import { getUserMarks } from "@/api/getUserMarks";
import { formatApiError } from "@/api/client";
import type { MarksReport } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

const round = (n: number) => (Math.round(n * 100) / 100).toString();

export default function MarksPage() {
  return (
    <RouteGuard>
      <MarksContent />
    </RouteGuard>
  );
}

function MarksContent() {
  const auth = useAuth();
  const t = useT();
  const [mine] = createResource(() => getMyMarks());
  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");

  return (
    <div class="space-y-6">
      <PageHeader
        accent="amber"
        eyebrow={t("nav.marks")}
        title={t("marks.title")}
        description={t("marks.subtitle")}
      />

      <Suspense fallback={<PageSpinner />}>
        <Show when={mine()} fallback={<p class="text-sm text-muted-foreground">{t("marks.empty")}</p>}>
          {(report) => <MarksReportView report={report()} />}
        </Show>
      </Suspense>

      <Show when={isTeacherPlus()}>
        <TeacherLookup />
      </Show>
    </div>
  );
}

function MarksReportView(props: { report: MarksReport }) {
  const t = useT();
  return (
    <Show
      when={props.report.courses.length > 0}
      fallback={
        <div class="rounded-md border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {t("marks.empty")}
        </div>
      }
    >
      <div class="space-y-4">
        <div class="surface-card flex items-center justify-between gap-3 p-5">
          <span class="text-sm text-muted-foreground">{t("marks.overall")}</span>
          <p class="font-display text-3xl font-semibold tabular-nums">
            {props.report.overall_average == null ? "—" : round(props.report.overall_average)}
            <Show when={props.report.overall_average != null}>
              <span class="text-base font-medium text-muted-foreground"> / 100</span>
            </Show>
          </p>
        </div>

        <For each={props.report.courses}>
          {(block) => (
            <article class="surface-card space-y-3 p-5">
              <header class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-display text-lg font-semibold">
                  <Link
                    to="/courses/$id"
                    params={{ id: block.course.id }}
                    class="hover:text-primary hover:underline"
                  >
                    {block.course.title}
                  </Link>
                </h3>
                <Badge variant="secondary" title={t("marks.courseAvg")}>
                  {block.average == null ? "—" : round(block.average)}
                </Badge>
              </header>

              <Show
                when={block.results.length > 0}
                fallback={
                  <p class="text-sm text-muted-foreground">{t("exams.noResults")}</p>
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("marks.exam")}</TableHead>
                      <TableHead>{t("exams.kind")}</TableHead>
                      <TableHead>{t("marks.weight")}</TableHead>
                      <TableHead>{t("marks.mark")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <For each={block.results}>
                      {(entry) => (
                        <TableRow>
                          <TableCell>
                            <Link
                              to="/exams/$id"
                              params={{ id: entry.exam }}
                              class="font-medium hover:underline"
                            >
                              {entry.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" class="capitalize">
                              {entry.kind}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.weight}</TableCell>
                          <TableCell class="font-semibold tabular-nums">{entry.mark}</TableCell>
                        </TableRow>
                      )}
                    </For>
                  </TableBody>
                </Table>
              </Show>
            </article>
          )}
        </For>
      </div>
    </Show>
  );
}

function TeacherLookup() {
  const t = useT();
  const [userId, setUserId] = createSignal("");
  const [lookupId, setLookupId] = createSignal<string | null>(null);
  const [error, setError] = createSignal("");
  const [report] = createResource(lookupId, async (id) => {
    if (!id) return null;
    return getUserMarks(id);
  });

  return (
    <section class="surface-card space-y-4 p-5">
      <h2 class="font-display text-lg font-semibold">{t("marks.lookup")}</h2>
      <form
        class="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const id = userId().trim();
          if (!id) return;
          setLookupId(id);
        }}
      >
        <div class="min-w-0 flex-1 space-y-1.5">
          <Label for="marks-user">{t("events.userId")}</Label>
          <Input
            id="marks-user"
            value={userId()}
            onInput={(e) => setUserId(e.currentTarget.value)}
          />
        </div>
        <Button type="submit">{t("marks.show")}</Button>
      </form>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <Show when={report.error}>
        <p class="text-sm text-destructive">{formatApiError(report.error)}</p>
      </Show>
      <Suspense fallback={<PageSpinner />}>
        <Show when={report()}>
          {(r) => (
            <div class="space-y-3 border-t pt-4">
              <p class="text-sm text-muted-foreground">
                {t("marks.forUser", { user: lookupId() ?? "" })}
              </p>
              <MarksReportView report={r()} />
            </div>
          )}
        </Show>
      </Suspense>
    </section>
  );
}
