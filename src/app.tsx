import { RouterProvider } from "@tanstack/solid-router";
import { ErrorBoundary, Suspense, lazy } from "solid-js";
import { currentLocale, formatApiError } from "@/api/client";
import { IconAlert } from "@/components/ui/icons";
import { router } from "@/routes/router";

const RouterDevtools = import.meta.env.DEV ? lazy(() => import("@/router-devtools")) : undefined;

// A deploy can invalidate a lazy route chunk while an older tab is still
// open. Vite exposes this event for exactly that case; reload once so the
// browser gets the new index.html and its matching chunk manifest.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const reloadKey = "hezarfen:chunk-reload";
    if (sessionStorage.getItem(reloadKey) === "1") {
      sessionStorage.removeItem(reloadKey);
      return;
    }
    sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  });
}

// Last-resort backstop for anything that throws during render. It lives above
// the i18n provider, so it mirrors the client's own bilingual-fallback idiom
// instead of using t(...); a real message + reload beats a blank document.
function RootErrorFallback(props: { error: unknown; reset: () => void }) {
  const tr = currentLocale() === "tr";
  // Keep the raw error + stack in the console; the box only shows a friendly
  // one-liner, so without this the actual throw (e.g. a transient render error)
  // is lost and impossible to trace after the fact.
  console.error("Uncaught render error:", props.error);
  return (
    <div class="flex min-h-[var(--app-viewport)] items-center justify-center bg-background px-4">
      <div class="w-full max-w-[420px] space-y-5 rounded-xl border border-border-line bg-surface-base p-8 text-center shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)]">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <IconAlert class="h-6 w-6" />
        </div>
        <div class="space-y-2">
          <p class="text-4xl font-semibold tracking-tight text-text-strong">500</p>
          <p class="text-sm leading-[21px] text-text-subtle">{formatApiError(props.error)}</p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          onClick={() => {
            props.reset();
            window.location.reload();
          }}
        >
          {tr ? "Yeniden yükle" : "Reload"}
        </button>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary fallback={(error, reset) => <RootErrorFallback error={error} reset={reset} />}>
      <RouterProvider router={router} />
      {RouterDevtools ? (
        <Suspense>
          <RouterDevtools />
        </Suspense>
      ) : null}
    </ErrorBoundary>
  );
}
