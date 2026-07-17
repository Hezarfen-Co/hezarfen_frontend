import { RouterProvider } from "@tanstack/solid-router";
import { router } from "@/routes/router";

export function App() {
  return <RouterProvider router={router} />;
}
