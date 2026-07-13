import { Navigate } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import type { Role } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export function RouteGuard(props: ParentProps<{ minRole?: Role }>) {
  const auth = useAuth();
  const t = useT();

  return (
    <Show when={!auth.loading()} fallback={<PageSpinner />}>
      <Show when={auth.user()} fallback={<Navigate to="/login" />}>
        {(u) => (
          <Show
            when={!props.minRole || hasMinRole(u().role, props.minRole)}
            fallback={
              <Alert variant="destructive">
                {t("common.accessDenied")}
              </Alert>
            }
          >
            {props.children}
          </Show>
        )}
      </Show>
    </Show>
  );
}
