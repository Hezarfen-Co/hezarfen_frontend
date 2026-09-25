import type { ErrorComponentProps } from "@tanstack/solid-router";
import { PageLoadError } from "@/components/layout/page-load-error";
import { RecordNotFound } from "@/components/layout/record-not-found";
import { isNotFoundError } from "@/lib/record-list-path";

/**
 * The router's default error component: a page that throws while rendering
 * (typically a failed list read through `resource.latest`) shows this in
 * place of its own content, inside the shell, so navigation keeps working.
 * Without it the throw reached the app-wide boundary and replaced everything
 * with a full-screen 500.
 *
 * It can also render for the root route, above the i18n provider, so its
 * text comes from `pageStateText` instead of `useT()`.
 */
export function RouteErrorFallback(props: ErrorComponentProps) {
  // A missing record is an answer, not a failure: retrying a 404 changes nothing.
  if (isNotFoundError(props.error)) {
    return <RecordNotFound />;
  }
  console.error("Route render error:", props.error);
  return <PageLoadError error={props.error} reset={props.reset} />;
}
