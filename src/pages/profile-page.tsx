import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { useLocation, useParams } from "@tanstack/solid-router";
import { getClassesByUserId, getMyClasses } from "@/api/classes";
import { getLimits } from "@/api/limits";
import { getMyProfile, getUserProfile } from "@/api/users";
import { ApiError, formatApiError, type Profile } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { RoleBadge } from "@/components/layout/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconSchool } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { AvatarUpload } from "@/components/users/avatar-upload";
import { BadgeGrid } from "@/components/users/badge-grid";
import { ProfileForm } from "@/components/users/profile-form";
import { ProfileMemberships } from "@/components/users/profile-memberships";
import { UserAvatar } from "@/components/users/user-avatar";
import { personLabel } from "@/lib/person";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function ProfilePage() {
  // No role floor: the backend lets any authenticated account read a profile.
  // A parent's narrower reach is enforced there with a 403, and a parent *may*
  // read their linked students — a client role gate would wrongly close that.
  return (
    <RouteGuard>
      <ProfileContent />
    </RouteGuard>
  );
}

function ProfileContent() {
  const auth = useAuth();
  const t = useT();
  const location = useLocation();
  const params = useParams({ strict: false });
  // The location() touch works around TanStack's params memo not invalidating
  // on a same-route navigation; the class and admin detail pages do the same.
  const target = createMemo(() => {
    location();
    return (params() as { userId?: string }).userId ?? "me";
  });

  const [profile, { refetch }] = createResource(target, (id) =>
    id === "me" ? getMyProfile() : getUserProfile(id),
  );
  const [limits] = createResource(() => getLimits());
  const [editing, setEditing] = createSignal(false);

  const isSelf = (p: Profile) => target() === "me" || p.id === auth.user()?.id;
  const name = (p: Profile) => p.display_name || p.username;

  // The profile payload's class refs carry no homeroom teacher, so read the
  // classes again through /classes, which does. `/classes/me` is open to every
  // role; `/classes/user/{id}` is teacher+ or a linked parent, so a student
  // looking at a peer skips the call entirely rather than earning a 403 — those
  // rows then simply render without a teacher.
  // A plain string key, not an object: createResource compares sources by
  // identity, and a fresh object each time the profile refetches would drag a
  // second request along with every avatar change.
  const classSource = createMemo<string | null>(() => {
    const p = profile.latest;
    if (!p) return null;
    if (isSelf(p)) return "me";
    const role = auth.user()?.role;
    const canObserve = role === "teacher" || role === "manager" || role === "admin" || role === "parent";
    return canObserve ? `user:${p.id}` : null;
  });

  const [detailedClasses] = createResource(classSource, async (source) => {
    try {
      const page = source === "me"
        ? await getMyClasses({ limit: 50 })
        : await getClassesByUserId(source.slice("user:".length), { limit: 50 });
      return page.items;
    } catch {
      // A linked-parent guess that turned out wrong loses the teacher name, not
      // the page.
      return [];
    }
  });

  // A person is normally in exactly one şube; when there are several the first
  // is the one the header calls out and the rest live in the tab below.
  const currentClass = () => detailedClasses.latest?.[0] ?? null;

  const errorMessage = () => {
    const err = profile.error as unknown;
    if (err instanceof ApiError && err.status === 403 && auth.user()?.role === "parent") {
      return t("profile.forbiddenParent");
    }
    return formatApiError(err);
  };

  return (
    <div class="space-y-6">
      <Show when={profile.error}>
        <ErrorAlert message={errorMessage()} onRetry={() => void refetch()} />
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <Show when={!profile.error && profile()}>
          {(p) => (
            <>
              <section class="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs">
                <div class="flex min-w-0 flex-wrap items-center gap-4">
                  <Show
                    when={isSelf(p())}
                    fallback={
                      <UserAvatar
                        userId={p().id}
                        name={name(p())}
                        hasAvatar={p().avatar !== null}
                        size="xl"
                      />
                    }
                  >
                    <AvatarUpload
                      userId={p().id}
                      name={name(p())}
                      hasAvatar={p().avatar !== null}
                      onChanged={() => void refetch()}
                    />
                  </Show>
                  <div class="min-w-0 space-y-1">
                    <h1 class="truncate text-xl font-semibold">{name(p())}</h1>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-sm text-muted-foreground">@{p().username}</span>
                      <RoleBadge role={p().role} />
                    </div>
                    <p class="max-w-prose whitespace-pre-wrap text-sm text-muted-foreground">
                      {p().bio || t("profile.bioEmpty")}
                    </p>
                    <Show when={currentClass() ?? p().classes[0]}>
                      {(c) => (
                        <p class="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-sm">
                          <span class="inline-flex items-center gap-1.5 font-medium">
                            <IconSchool class="h-4 w-4 text-muted-foreground" />
                            {c().name}
                          </span>
                          <Show when={c().grade}>
                            {(g) => <Badge variant="secondary" class="rounded-md">{g()}</Badge>}
                          </Show>
                          <span class="text-muted-foreground">
                            ·{" "}
                            {currentClass()?.teacher
                              ? `${t("classGroups.homeroomTeacher")}: ${personLabel(currentClass()!.teacher)}`
                              : t("classGroups.noTeacher")}
                          </span>
                        </p>
                      )}
                    </Show>
                  </div>
                </div>
                <Show when={isSelf(p()) && auth.user()}>
                  <Button type="button" size="sm" variant="outline" class="rounded-lg" onClick={() => setEditing(true)}>
                    <IconEdit class="mr-1.5 h-4 w-4" />
                    {t("profile.edit")}
                  </Button>
                </Show>
              </section>

              <section class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label={t("profile.statFocusHours")} value={Math.floor(p().stats.pomodoro_focus_ms_total / 3_600_000)} />
                <StatCard label={t("profile.statSessions")} value={p().stats.pomodoro_finished_total} />
                <StatCard label={t("profile.statHomework")} value={p().stats.homework_submitted_total} />
                <StatCard label={t("profile.statOnTime")} value={p().stats.homework_on_time_total} />
                <StatCard label={t("profile.statExams")} value={p().stats.exam_sat_total} />
              </section>

              <BadgeGrid
                catalog={limits.latest?.badges?.catalog ?? []}
                earned={p().badges}
                stats={p().stats}
              />

              <ProfileMemberships
                classes={p().classes}
                courses={p().courses}
                detailed={detailedClasses.latest ?? []}
                classTotal={p().stats.classes}
                courseTotal={p().stats.courses}
              />

              <SidePanel open={editing()} onOpenChange={setEditing} title={t("profile.edit")}>
                <Show when={auth.user()}>
                  {(u) => (
                    <ProfileForm
                      user={u()}
                      profile={{ display_name: p().display_name, bio: p().bio }}
                      maxDisplayNameLen={limits.latest?.user.max_display_name_len}
                      maxBioLen={limits.latest?.user.max_bio_len}
                      onSaved={() => {
                        setEditing(false);
                        void auth.refresh();
                        void refetch();
                      }}
                    />
                  )}
                </Show>
              </SidePanel>
            </>
          )}
        </Show>
      </Suspense>
    </div>
  );
}

function StatCard(props: { label: string; value: number }) {
  return (
    <div class="rounded-lg border bg-card p-3 shadow-xs">
      <p class="text-xs text-muted-foreground">{props.label}</p>
      <p class="text-xl font-semibold tabular-nums">{props.value}</p>
    </div>
  );
}
