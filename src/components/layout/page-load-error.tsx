import { useLocation } from "@tanstack/solid-router";
import { createSignal, For, onCleanup } from "solid-js";
import { ApiError, formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronDown } from "@/components/ui/icons";
import { PAGE_STATE_CARD, PageCenter, pageStateText as tt } from "@/components/layout/page-center";
import type { MessageKey } from "@/i18n/messages";

function errorKind(err: unknown): MessageKey {
  if (err instanceof ApiError) {
    if (err.status === 429) return "errors.pageLoad.kind.rateLimited";
    if (err.status === 403 && err.module != null) return "errors.pageLoad.kind.moduleOff";
    if (err.status === 401) return "errors.pageLoad.kind.unauthorized";
    if (err.status === 403) return "errors.pageLoad.kind.forbidden";
    if (err.status === 408) return "errors.pageLoad.kind.timeout";
    if (err.status === 503) return "errors.pageLoad.kind.unavailable";
    if (err.status >= 500) return "errors.pageLoad.kind.server";
    return "errors.pageLoad.kind.request";
  }
  // fetch() rejects with a TypeError when the request never got an answer.
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return typeof navigator !== "undefined" && navigator.onLine === false
      ? "errors.pageLoad.kind.offline"
      : "errors.pageLoad.kind.network";
  }
  return "errors.pageLoad.kind.render";
}

function rawMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message ? `${err.name}: ${err.message}` : err.name;
  return String(err);
}

/**
 * A page that could not load: the reason, a retry that waits out a
 * rate limit, and the technical details behind a disclosure. Used by the
 * router's error component and by RouteGuard when the session read fails.
 */
export function PageLoadError(props: { error: unknown; reset: () => void }) {
  const location = useLocation();
  const api = props.error instanceof ApiError ? props.error : null;

  // A rate-limited or unavailable answer says when a retry can work; retrying
  // sooner only earns another refusal, so the button waits it out.
  const [wait, setWait] = createSignal(
    api && (api.status === 429 || api.status === 503) && api.retryAfter != null ? Math.max(0, Math.ceil(api.retryAfter)) : 0,
  );
  if (wait() > 0) {
    const timer = setInterval(() => {
      setWait((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0) clearInterval(timer);
        return next;
      });
    }, 1000);
    onCleanup(() => clearInterval(timer));
  }

  const rows = (): { label: string; value: string; mono?: boolean }[] => {
    const list: { label: string; value: string; mono?: boolean }[] = [];
    list.push({ label: tt("errors.pageLoad.kind"), value: tt(errorKind(props.error)) });
    if (api) list.push({ label: tt("errors.pageLoad.status"), value: String(api.status), mono: true });
    if (api?.code) list.push({ label: tt("errors.pageLoad.code"), value: api.code, mono: true });
    if (api?.module) list.push({ label: tt("errors.pageLoad.module"), value: api.module, mono: true });
    if (api?.retryAfter != null)
      list.push({ label: tt("errors.pageLoad.retryAfter"), value: tt("errors.pageLoad.seconds", { seconds: api.retryAfter }) });
    list.push({ label: tt("errors.pageLoad.page"), value: location().href, mono: true });
    const raw = rawMessage(props.error).trim();
    if (raw) list.push({ label: tt("errors.pageLoad.message"), value: raw, mono: true });
    return list;
  };

  return (
    <PageCenter alert>
      <EmptyState
        kind="error"
        class={PAGE_STATE_CARD}
        title={tt("errors.pageLoad.title")}
        description={formatApiError(props.error)}
        action={
          <div class="flex w-full flex-col items-center gap-5">
            <Button type="button" size="sm" class="h-9 rounded-lg px-4" disabled={wait() > 0} onClick={() => props.reset()}>
              {wait() > 0 ? tt("errors.pageLoad.retryIn", { seconds: wait() }) : tt("errors.pageLoad.retry")}
            </Button>
            <details class="group w-full rounded-lg border border-border-hairline bg-surface-tint/60 text-left">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-text-strong outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span>{tt("errors.pageLoad.details")}</span>
                <IconChevronDown class="h-4 w-4 shrink-0 text-text-subtle transition-transform group-open:rotate-180" />
              </summary>
              <dl class="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-border-hairline px-4 py-3 text-xs sm:grid-cols-[max-content_1fr] sm:gap-y-2">
                <For each={rows()}>
                  {(row) => (
                    <>
                      <dt class="pt-1 font-medium text-text-subtle sm:pt-0">{row.label}</dt>
                      <dd class={row.mono ? "break-all font-mono text-text-strong" : "text-text-strong"}>{row.value}</dd>
                    </>
                  )}
                </For>
              </dl>
            </details>
          </div>
        }
      />
    </PageCenter>
  );
}
