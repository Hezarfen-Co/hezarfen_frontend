import { For, Show, Suspense } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { ApiError, formatApiError, type PersonRef, type User } from "@/api/client";
import { getMyStudents } from "@/api/parents";
import { getUserById, getUserSearch } from "@/api/users";
import { DetailField } from "@/components/ui/detail-field";
import { EmptyInline } from "@/components/ui/empty-inline";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import type { StudentInfoSource } from "@/lib/student-info-access";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

type Field = { label: string; value: string };
type Section = { title: string; hint?: string; fields: Field[] };

/** What each source can actually read; fields no endpoint fills stay out. */
type Loaded = {
  student: Partial<Pick<User, "name" | "surname" | "email" | "phone" | "birth_date" | "student_number">> | null;
  guardian: User | null;
};

const forbidden = (err: unknown) => err instanceof ApiError && err.status === 403;

/**
 * Record details about a student — and, for a linked parent, about the parent —
 * that the public profile never carries (legal name, student number, contact,
 * birth date). Each viewer only reads what the backend already grants them; see
 * `studentInfoSource`.
 */
export function StudentInfoPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: StudentInfoSource;
  /** `name` is what the profile heading already shows; a legal name equal to
   *  it is not repeated here. */
  student: { id: string; username: string; name: string };
}) {
  const t = useT();
  const prefs = usePreferences();
  const auth = useAuth();

  const [data, { refetch }] = createResource(
    () => (props.open ? props.source : null),
    async (source): Promise<Loaded> => {
      const me = auth.user() ?? null;
      switch (source) {
        case "self":
          return { student: me, guardian: null };
        case "admin":
          try {
            return { student: await getUserById(props.student.id), guardian: null };
          } catch (err) {
            if (forbidden(err)) return { student: null, guardian: null };
            throw err;
          }
        case "staff": {
          // /users/{id} is admin-only; the search ref is the one place a
          // teacher or manager reads a student's number.
          try {
            const page = await getUserSearch(props.student.username, undefined, "student", { limit: 20 });
            const ref = page.items.find((p) => p.id === props.student.id);
            return { student: ref ? { student_number: ref.student_number } : null, guardian: null };
          } catch (err) {
            if (forbidden(err)) return { student: null, guardian: null };
            throw err;
          }
        }
        case "parent": {
          let ref: PersonRef | undefined;
          try {
            ref = (await getMyStudents({ limit: 100 })).items.find((p) => p.id === props.student.id);
          } catch (err) {
            if (!forbidden(err)) throw err;
          }
          return { student: ref ? { student_number: ref.student_number } : null, guardian: me };
        }
      }
    },
  );

  const fullName = (u: { name?: string | null; surname?: string | null } | null) =>
    [u?.name, u?.surname].map((s) => s?.trim()).filter(Boolean).join(" ");

  // birth_date is a calendar date ("1990-01-02"); read it as local midnight so
  // no time zone shifts it a day.
  const birthDate = (raw: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return raw;
    return new Intl.DateTimeFormat(prefs.locale() === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" }).format(
      new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    );
  };

  const present = (fields: { label: string; value: string | null | undefined }[]): Field[] =>
    fields
      .map((f) => ({ label: f.label, value: f.value?.trim() ?? "" }))
      .filter((f) => f.value !== "");

  const sections = (d: Loaded): Section[] => {
    const out: Section[] = [];
    const s = d.student;
    if (s) {
      const fields = present([
        { label: t("profile.fullName"), value: fullName(s) === props.student.name ? null : fullName(s) },
        { label: t("roster.studentNumber"), value: s.student_number },
        { label: t("profile.birthDate"), value: s.birth_date ? birthDate(s.birth_date) : null },
        { label: t("profile.email"), value: s.email },
        { label: t("profile.phone"), value: s.phone },
      ]);
      if (fields.length) out.push({ title: t("profile.studentInfoStudent"), fields });
    }
    const g = d.guardian;
    if (g) {
      const fields = present([
        { label: t("profile.fullName"), value: fullName(g) || g.display_name },
        { label: t("profile.email"), value: g.email },
        { label: t("profile.phone"), value: g.phone },
      ]);
      if (fields.length) {
        out.push({ title: t("profile.studentInfoGuardian"), hint: t("profile.studentInfoGuardianHint"), fields });
      }
    }
    return out;
  };

  return (
    <SidePanel
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t("profile.studentInfo")}
      description={t("profile.studentInfoHint")}
    >
      <Show when={data.error}>
        <ErrorAlert message={formatApiError(data.error)} onRetry={() => void refetch()} />
      </Show>
      <Suspense fallback={<PageSpinner />}>
        <Show when={!data.error && data()}>
          {(d) => (
            <Show
              when={sections(d()).length > 0}
              fallback={
                <EmptyInline
                  size="md"
                  title={t("profile.studentInfoEmpty")}
                  hint={t("profile.studentInfoEmptyHint")}
                />
              }
            >
              <div class="space-y-6">
                <For each={sections(d())}>
                  {(section) => (
                    <section class="space-y-3">
                      <div>
                        <h3 class="text-sm font-semibold">{section.title}</h3>
                        <Show when={section.hint}>
                          <p class="text-xs text-muted-foreground">{section.hint}</p>
                        </Show>
                      </div>
                      <div class="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                        <For each={section.fields}>
                          {(f) => <DetailField label={f.label} value={f.value} />}
                        </For>
                      </div>
                    </section>
                  )}
                </For>
              </div>
            </Show>
          )}
        </Show>
      </Suspense>
    </SidePanel>
  );
}
