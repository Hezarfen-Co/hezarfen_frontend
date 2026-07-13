import { RouterProvider } from "@tanstack/solid-router";
import { AuthProvider } from "@/stores/auth-context";
import { PreferencesProvider } from "@/stores/preferences-context";
import { router } from "@/routes/router";

export function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        {import.meta.env.DEV ? <RouterDevtoolsLazy /> : null}
      </AuthProvider>
    </PreferencesProvider>
  );
}

function RouterDevtoolsLazy() {
  if (import.meta.env.DEV) {
    void import("./router-devtools");
  }
  return null;
}
