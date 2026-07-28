import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import MyStudentsPage from "@/pages/my-students-page";
import { RouteGuard } from "@/components/layout/route-guard";
import { IconChart, IconClipboardCheck, IconClock } from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function StudentsHubPage() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const links: { to: string; label: MessageKey; Icon: typeof IconChart; description: string }[] = [
    { to: "/management/student-marks", label: "nav.studentMarks", Icon: IconChart, description: locale() === "tr" ? "Öğrenci ara, sonuçları ve notları incele." : "Find students and review results and marks." },
    { to: "/management/student-attendance", label: "nav.studentAttendance", Icon: IconClipboardCheck, description: locale() === "tr" ? "Ders ve etkinlik devam kayıtlarını incele." : "Review class and event attendance." },
    { to: "/management/pomodoros", label: "nav.studentPomodoro", Icon: IconClock, description: locale() === "tr" ? "Öğrenci odak geçmişini görüntüle." : "View student focus history." },
  ];

  return (
    <Show when={auth.user()?.role === "parent"} fallback={
      <RouteGuard minRole="teacher">
        <div class="space-y-5">
          <header>
            <h1 class="font-display text-xl font-semibold">{t("nav.students")}</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              {locale() === "tr" ? "Arama, not, yoklama ve odak geçmişi." : "Search, marks, attendance, and focus history."}
            </p>
          </header>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={links}>
              {(item) => (
                <Link to={item.to} class="flex gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30 text-muted-foreground"><item.Icon class="h-4.5 w-4.5" /></span>
                  <span><span class="block text-sm font-semibold">{t(item.label)}</span><span class="mt-1 block text-xs text-muted-foreground">{item.description}</span></span>
                </Link>
              )}
            </For>
          </div>
        </div>
      </RouteGuard>
    }>
      <MyStudentsPage />
    </Show>
  );
}
