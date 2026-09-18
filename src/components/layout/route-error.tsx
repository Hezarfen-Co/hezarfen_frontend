import type { ErrorComponentProps } from "@tanstack/solid-router";
import { currentLocale, formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { IconAlert } from "@/components/ui/icons";

/**
 * The router's default error component: a page that throws while rendering
 * (typically a failed list read through `resource.latest`) shows this in
 * place of its own content, inside the shell, so navigation keeps working.
 * Without it the throw reached the app-wide boundary and replaced everything
 * with a full-screen 500.
 *
 * It can also render for the root route, above the i18n provider, so it uses
 * the client's bilingual-fallback idiom instead of `t(...)`.
 */
export function RouteErrorFallback(props: ErrorComponentProps) {
  const tr = () => currentLocale() === "tr";
  console.error("Route render error:", props.error);
  return (
    <div role="alert" class="mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 rounded-xl border border-border-line bg-surface-base px-6 py-10 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <IconAlert class="h-5 w-5" />
      </span>
      <div class="space-y-1.5">
        <p class="text-base font-semibold text-text-strong">{tr() ? "Bu sayfa yüklenemedi" : "This page could not load"}</p>
        <p class="text-sm text-text-subtle">{formatApiError(props.error)}</p>
      </div>
      <Button type="button" size="sm" class="h-9 px-4" onClick={() => props.reset()}>
        {tr() ? "Tekrar dene" : "Try again"}
      </Button>
    </div>
  );
}
