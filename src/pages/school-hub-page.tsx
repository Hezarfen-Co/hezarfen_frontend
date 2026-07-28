import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { RouteGuard } from "@/components/layout/route-guard";
import { IconBriefcase, IconCalendarDays, IconSettings, IconUsers, IconUtensils } from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function SchoolHubPage() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const links: { to: string; label: MessageKey; Icon: typeof IconSettings; admin?: boolean }[] = [
    { to: "/management/settings", label: "nav.settings", Icon: IconSettings },
    { to: "/management/terms", label: "nav.terms", Icon: IconCalendarDays },
    { to: "/management/staff-work", label: "nav.staffWork", Icon: IconBriefcase },
    { to: "/meals", label: "nav.meals", Icon: IconUtensils },
    { to: "/admin/users", label: "nav.users", Icon: IconUsers, admin: true },
  ];

  return (
    <RouteGuard minRole="manager">
      <div class="space-y-5">
        <header>
          <h1 class="font-display text-xl font-semibold">{t("nav.school")}</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {locale() === "tr" ? "Okul ayarları, dönemler, kullanıcılar, personel ve yemek yönetimi." : "School settings, terms, users, staff, and meal administration."}
          </p>
        </header>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <For each={links.filter((item) => !item.admin || auth.user()?.role === "admin")}>
            {(item) => (
              <Link to={item.to} class="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30 text-muted-foreground"><item.Icon class="h-4.5 w-4.5" /></span>
                <span class="text-sm font-semibold">{t(item.label)}</span>
              </Link>
            )}
          </For>
        </div>
        <Show when={auth.user()?.role !== "admin"}>
          <p class="text-xs text-muted-foreground">{locale() === "tr" ? "Kullanıcı yönetimi yalnızca yöneticilere açıktır." : "User administration remains admin-only."}</p>
        </Show>
      </div>
    </RouteGuard>
  );
}
