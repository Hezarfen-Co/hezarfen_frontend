import { RouterProvider } from "@tanstack/solid-router";
import { ErrorBoundary, Suspense, lazy } from "solid-js";
import { currentLocale, formatApiError } from "@/api/client";
import { router } from "@/routes/router";

const RouterDevtools = import.meta.env.DEV ? lazy(() => import("@/router-devtools")) : undefined;

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
    <div class="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div class="w-full max-w-md space-y-4 rounded-md border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
        <p class="text-sm">{formatApiError(props.error)}</p>
        <button
          type="button"
          class="rounded-md border border-current px-4 py-2 text-sm font-medium"
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
