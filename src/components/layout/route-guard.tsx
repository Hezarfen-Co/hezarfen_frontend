import { Link, Navigate } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import type { Role } from "@/api/client";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconHome, IconLock } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { hasExactRole, roleInRange } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

function AccessDeniedCard() {
  const t = useT();
  return (
    <div class="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div class="w-full max-w-[420px] space-y-5 rounded-xl border border-border-line bg-surface-base p-8 text-center shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)]">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning-text">
          <IconLock class="h-6 w-6" />
        </div>
        <div class="space-y-2">
          <p class="text-4xl font-semibold tracking-tight text-text-strong">403</p>
          <p class="text-base font-semibold text-text-strong">{t("common.accessDenied")}</p>
          <p class="text-sm leading-[21px] text-text-subtle">{t("errors.accessDeniedDescription")}</p>
        </div>
        <Link
          to="/"
          class="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <IconHome class="mr-1 h-4 w-4" />
          {t("common.goHome")}
        </Link>
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
  const t = useT();

  const allowed = (role: Role) => {
    if (props.exactRole) return hasExactRole(role, props.exactRole);
    if (props.minRole || props.maxRole) return roleInRange(role, props.minRole, props.maxRole);
    return true;
  };

  return (
    <Show when={!auth.loading()} fallback={<PageSpinner />}>
      <Show when={!auth.error()} fallback={
        <Alert variant="destructive">
          <div class="space-y-3">
            <p>{formatApiError(auth.error())}</p>
            <Button variant="outline" size="sm" onClick={() => void auth.refresh()}>
              {t("common.tryAgain")}
            </Button>
          </div>
        </Alert>
      }>
      <Show when={auth.user()} fallback={<Navigate to="/login" />}>
        {(u) => (
          <Show when={allowed(u().role)} fallback={<AccessDeniedCard />}>
            {props.children}
          </Show>
        )}
      </Show>
      </Show>
    </Show>
  );
}
