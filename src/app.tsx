import { RouterProvider } from "@tanstack/solid-router";
import { Suspense, lazy } from "solid-js";
import { router } from "@/routes/router";
import { AuthProvider } from "@/stores/auth-context";
import { PreferencesProvider } from "@/stores/preferences-context";

const RouterDevtools = import.meta.env.DEV ? lazy(() => import("@/router-devtools")) : undefined;

export function App() {
  // Providers wrap the whole router so pending/error shells and every route
  // can call useAuth / usePreferences (root-route-only providers miss them).
  return (
    <PreferencesProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        {RouterDevtools ? (
          <Suspense>
            <RouterDevtools />
          </Suspense>
        ) : null}
      </AuthProvider>
    </PreferencesProvider>
  );
}
