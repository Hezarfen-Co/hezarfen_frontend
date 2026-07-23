import { Navigate } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import type { Role } from "@/api/client";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { hasExactRole, roleInRange } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

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
          <Show
            when={allowed(u().role)}
            fallback={<Alert variant="destructive">{t("common.accessDenied")}</Alert>}
          >
            {props.children}
          </Show>
        )}
      </Show>
      </Show>
    </Show>
  );
}
