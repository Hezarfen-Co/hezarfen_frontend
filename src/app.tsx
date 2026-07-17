import { RouterProvider } from "@tanstack/solid-router";
import { Suspense, lazy } from "solid-js";
import { AuthProvider } from "@/stores/auth-context";
import { PreferencesProvider } from "@/stores/preferences-context";
import { router } from "@/routes/router";

const RouterDevtools = import.meta.env.DEV ? lazy(() => import("./router-devtools")) : undefined;

export function App() {
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
