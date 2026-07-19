import { RouterProvider } from "@tanstack/solid-router";
import { Suspense, lazy } from "solid-js";
import { router } from "@/routes/router";

const RouterDevtools = import.meta.env.DEV ? lazy(() => import("@/router-devtools")) : undefined;

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      {RouterDevtools ? (
        <Suspense>
          <RouterDevtools />
        </Suspense>
      ) : null}
    </>
  );
}
