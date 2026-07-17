import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { router } from "@/routes/router";

export default function RouterDevtools() {
  return <TanStackRouterDevtools router={router} position="bottom-right" />;
}
