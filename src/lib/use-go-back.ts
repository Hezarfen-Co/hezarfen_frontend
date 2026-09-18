import { useCanGoBack, useLocation, useNavigate, useRouter } from "@tanstack/solid-router";
import { backTarget } from "@/lib/back-target";

/**
 * Back within the app: history when there is an in-app entry behind us, the
 * nearest existing parent route otherwise. The browser's own back on a deep
 * link or a fresh tab would leave the app.
 */
export function useGoBack(): () => void {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const location = useLocation();
  const navigate = useNavigate();
  return () => {
    if (canGoBack()) return router.history.back();
    void navigate({ to: backTarget(location().pathname, Object.keys(router.routesByPath)) });
  };
}
