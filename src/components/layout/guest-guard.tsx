import { Navigate } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";

export function GuestGuard(props: ParentProps) {
  const auth = useAuth();

  return (
    <Show when={!auth.loading()} fallback={<PageSpinner />}>
      <Show when={!auth.user()} fallback={<Navigate to="/" />}>
        {props.children}
      </Show>
    </Show>
  );
}
