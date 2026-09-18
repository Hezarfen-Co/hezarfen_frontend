import { For, Show, createMemo, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { ClassGroup, ProfileClassRef, ProfileCourseRef } from "@/api/client";
import { courseKindLabel } from "@/lib/course-kind";
import { Badge } from "@/components/ui/badge";
import { IconBook, IconSchool } from "@/components/ui/icons";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const PAGE_SIZE = 5;

function pageOf<T>(rows: T[], page: number): T[] {
  return rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
}

function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

export function ProfileMemberships(props: {
  classes: ProfileClassRef[];
  courses: ProfileCourseRef[];
  /**
   * The same classes read through /classes, which carry the homeroom teacher
   * the profile payload omits. Empty when the viewer may not make that read —
   * a student looking at a peer — and the rows simply omit the teacher then.
   */
  detailed: ClassGroup[];
  classTotal: number;
  courseTotal: number;
}) {
  const t = useT();
  const [tab, setTab] = createSignal("classes");
  const [classPage, setClassPage] = createSignal(0);
  const [coursePage, setCoursePage] = createSignal(0);

  const teacherOf = (id: string) => {
    const match = props.detailed.find((c) => c.id === id);
    return match?.teacher ? personLabel(match.teacher) : null;
  };

  const classRows = createMemo(() => pageOf(props.classes, classPage()));
  const courseRows = createMemo(() => pageOf(props.courses, coursePage()));

  return (
    <Tabs value={tab()} onChange={setTab} class="rounded-lg border bg-card shadow-xs">
      <TabsList class="w-full justify-start rounded-none border-b bg-transparent px-2">
        <TabsTrigger value="classes">
          {t("profile.classes")}
          <span class="ml-1.5 tabular-nums text-muted-foreground">{props.classTotal}</span>
        </TabsTrigger>
        <TabsTrigger value="courses">
          {t("profile.courses")}
          <span class="ml-1.5 tabular-nums text-muted-foreground">{props.courseTotal}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="classes" class="p-3">
        <Show
          when={props.classes.length > 0}
          fallback={<p class="px-1 py-6 text-center text-sm text-muted-foreground">{t("profile.noClasses")}</p>}
        >
          <ul class="space-y-1.5">
            <For each={classRows()}>
              {(c) => (
                <li class="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                    <IconSchool class="h-4 w-4" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{c.name}</span>
                    <span class="block truncate text-xs text-muted-foreground">
                      {teacherOf(c.id)
                        ? `${t("classGroups.homeroomTeacher")}: ${teacherOf(c.id)}`
                        : t("classGroups.noTeacher")}
                    </span>
                  </span>
                  <Show when={c.grade}>
                    {(g) => (
                      <Badge variant="secondary" class="shrink-0 rounded-md">
                        {g()}
                      </Badge>
                    )}
                  </Show>
                </li>
              )}
            </For>
          </ul>
          <Show when={pageCount(props.classes.length) > 1}>
            <div class="mt-3">
              <PaginationControls
                page={classPage()}
                totalPages={pageCount(props.classes.length)}
                onPageChange={setClassPage}
              />
            </div>
          </Show>
        </Show>
      </TabsContent>

      <TabsContent value="courses" class="p-3">
        <Show
          when={props.courses.length > 0}
          fallback={<p class="px-1 py-6 text-center text-sm text-muted-foreground">{t("profile.noCourses")}</p>}
        >
          <ul class="space-y-1.5">
            <For each={courseRows()}>
              {(c) => (
                <li>
                  <Link
                    to="/courses/$id"
                    params={{ id: c.id }}
                    class="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <span
                      class={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        c.kind === "club" ? "bg-violet-500/10 text-violet-600 dark:text-violet-300" : "bg-primary/10 text-primary-text",
                      )}
                    >
                      <IconBook class="h-4 w-4" />
                    </span>
                    <span class="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
                    <Badge variant="outline" class="shrink-0 rounded-md">{courseKindLabel(c.kind, t)}</Badge>
                  </Link>
                </li>
              )}
            </For>
          </ul>
          <Show when={pageCount(props.courses.length) > 1}>
            <div class="mt-3">
              <PaginationControls
                page={coursePage()}
                totalPages={pageCount(props.courses.length)}
                onPageChange={setCoursePage}
              />
            </div>
          </Show>
        </Show>
      </TabsContent>
    </Tabs>
  );
}
