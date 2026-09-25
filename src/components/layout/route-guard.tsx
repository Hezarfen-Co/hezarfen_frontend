import { Link, Navigate, useLocation } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import type { Role } from "@/api/client";
import { PageLoadError } from "@/components/layout/page-load-error";
import { IconHome, IconLock } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { hasExactRole, hasMinRole, roleInRange } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

// Pages kept for one audience that staff reach by URL or an old link: where
// the school-wide view of the same data exists, point there instead.
const STAFF_ALTERNATIVES: Record<string, { to: string; minRole: Role }> = {
  "/marks": { to: "/management/student-marks", minRole: "teacher" },
  "/pomodoro": { to: "/management/pomodoros", minRole: "teacher" },
  "/students": { to: "/management/students", minRole: "manager" },
  "/students/attendance": { to: "/management/student-attendance", minRole: "teacher" },
  "/students/exams": { to: "/management/student-marks", minRole: "teacher" },
};

function AccessDeniedCard(props: { exactRole?: Role; userRole: Role }) {
  const t = useT();
  const location = useLocation();
  // Asking "the administrator" for access reads wrong to staff — often they
  // are the administrator. For a page kept for students or parents, say so.
  const audience = () =>
    props.exactRole && props.exactRole !== props.userRole && hasMinRole(props.userRole, "teacher")
      ? props.exactRole
      : null;
  const alternative = () => {
    if (!audience()) return null;
    const alt = STAFF_ALTERNATIVES[location().pathname.replace(/\/+$/, "")];
    return alt && hasMinRole(props.userRole, alt.minRole) ? alt.to : null;
  };
  return (
    <div class="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div class="w-full max-w-[420px] space-y-5 rounded-xl border border-border-line bg-surface-base p-8 text-center shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)]">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning-text">
          <IconLock class="h-6 w-6" />
        </div>
        <Show
          when={audience()}
          fallback={
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-tight text-text-strong">403</p>
              <p class="text-base font-semibold text-text-strong">{t("common.accessDenied")}</p>
              <p class="text-sm leading-[21px] text-text-subtle">{t("errors.accessDeniedDescription")}</p>
            </div>
          }
        >
          {(role) => (
            <div class="space-y-2">
              <p class="text-base font-semibold text-text-strong">
                {t(role() === "parent" ? "errors.parentOnlyTitle" : "errors.studentOnlyTitle")}
              </p>
              <p class="text-sm leading-[21px] text-text-subtle">
                {t(alternative() ? "errors.audienceOnlyWithAlternative" : "errors.audienceOnlyDescription")}
              </p>
            </div>
          )}
        </Show>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <Show when={alternative()}>
            {(to) => (
              <Link
                to={to()}
                class="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("errors.openStaffView")}
              </Link>
            )}
          </Show>
          <Link
            to="/"
            class={
              alternative()
                ? "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                : "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            }
          >
            <IconHome class="mr-1 h-4 w-4" />
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RouteGuard(
  props: ParentProps<{
    minRole?: Role;
    /** Inclusive upper bound (e.g. maxRole: "manager" excludes admin). */
    maxRole?: Role;
    /** When set, only this exact role may enter (e.g. student-only pages). */
    exactRole?: Role;
  }>,
) {
  const auth = useAuth();

  const allowed = (role: Role) => {
    if (props.exactRole) return hasExactRole(role, props.exactRole);
    if (props.minRole || props.maxRole) return roleInRange(role, props.minRole, props.maxRole);
    return true;
  };

  return (
    <Show when={!auth.loading()} fallback={<PageSpinner />}>
      {/* A failed session read (often a rate limit) gets the same full-page
          state as a failed page: the cause, a retry that waits out the
          limit, and the details — not a bare red box. */}
      <Show when={!auth.error()} fallback={<PageLoadError error={auth.error()} reset={() => void auth.refresh()} />}>
      <Show when={auth.user()} fallback={<Navigate to="/login" />}>
        {(u) => (
          <Show when={allowed(u().role)} fallback={<AccessDeniedCard exactRole={props.exactRole} userRole={u().role} />}>
            {props.children}
          </Show>
        )}
      </Show>
      </Show>
    </Show>
  );
}
