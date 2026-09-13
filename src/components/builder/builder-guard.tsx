import { Navigate } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useBuilder } from "@/stores/builder-context";

/** Renders its children only for a live builder session; otherwise sends the visitor to /builder/login. */
export function BuilderGuard(props: ParentProps) {
  const session = useBuilder();

  return (
    <Show when={!session.loading()} fallback={<PageSpinner />}>
      <Show
        when={session.builder()}
        fallback={
          <Show when={session.error()} fallback={<Navigate to="/builder/login" />}>
            <ErrorAlert message={formatApiError(session.error())} onRetry={session.refresh} />
          </Show>
        }
      >
        {props.children}
      </Show>
    </Show>
  );
}
