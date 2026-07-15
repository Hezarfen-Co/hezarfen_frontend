import { Navigate } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import type { Role } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { hasExactRole, hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export function RouteGuard(
  props: ParentProps<{
    minRole?: Role;
    /** When set, only this exact role may enter (e.g. student-only pages). */
    exactRole?: Role;
  }>,
) {
  const auth = useAuth();
  const t = useT();

  const allowed = (role: Role) => {
    if (props.exactRole) return hasExactRole(role, props.exactRole);
    if (props.minRole) return hasMinRole(role, props.minRole);
    return true;
  };

  return (
    <Show when={!auth.loading()} fallback={<PageSpinner />}>
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
  );
}
