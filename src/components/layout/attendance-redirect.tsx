import { Navigate } from "@tanstack/solid-router";
import { Show } from "solid-js";
import { RouteGuard } from "@/components/layout/route-guard";
import { useAuth } from "@/stores/auth-context";

/**
 * `/attendance` is an old link every role may still hold. Attendance lives on
 * a different page per role — a student's own report, a parent's child view,
 * the staff roll-call tool — so the alias resolves once the role is known
 * instead of sending everyone to the student-only page (a 403 for staff).
 */
export function AttendanceRedirect() {
  const auth = useAuth();
  return (
    <RouteGuard>
      <Show when={auth.user()?.role} keyed>
        {(role) =>
          role === "student" ? (
            <Navigate to="/marks" search={{ tab: "attendance" }} replace />
          ) : role === "parent" ? (
            <Navigate to="/students/attendance" replace />
          ) : (
            <Navigate to="/management/student-attendance" replace />
          )
        }
      </Show>
    </RouteGuard>
  );
}
