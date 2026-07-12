import { Navigate } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import type { Role } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";

export function RouteGuard(props: ParentProps<{ minRole?: Role }>) {
  const auth = useAuth();

  return (
    <Show when={!auth.loading()} fallback={<PageSpinner />}>
      <Show when={auth.user()} fallback={<Navigate to="/login" />}>
        {(u) => (
          <Show
            when={!props.minRole || hasMinRole(u().role, props.minRole)}
            fallback={
              <Alert variant="destructive">
                You do not have permission to view this page.
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
