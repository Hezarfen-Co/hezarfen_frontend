import { Link, useRouterState } from "@tanstack/solid-router";
import { For, Show, createMemo, type Component } from "solid-js";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";
import { cn } from "@/lib/cn";
import type { MessageKey } from "@/i18n/messages";
import type { Role } from "@/api/types";
import {
  IconBook,
  IconCalendar,
  IconChart,
  IconExam,
  IconGuide,
  IconHome,
  IconNote,
  IconUsers,
} from "@/components/ui/icons";

type NavItem = {
  to: string;
  labelKey: MessageKey;
  Icon: Component<{ class?: string }>;
  minRole?: Role;
  exact?: boolean;
};

const MAIN_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", Icon: IconHome, exact: true },
  { to: "/courses", labelKey: "nav.courses", Icon: IconBook },
  { to: "/exams", labelKey: "nav.exams", Icon: IconExam },
  { to: "/marks", labelKey: "nav.marks", Icon: IconChart },
  { to: "/notes", labelKey: "nav.notes", Icon: IconNote },
  { to: "/events", labelKey: "nav.events", Icon: IconCalendar },
  { to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, minRole: "teacher" },
  { to: "/admin/users", labelKey: "nav.users", Icon: IconUsers, minRole: "admin" },
];

const GUIDE_ITEM: NavItem = {
  to: "/guide",
  labelKey: "nav.guide",
  Icon: IconGuide,
};

function pathActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavLink(props: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = () => pathActive(pathname(), props.item.to, props.item.exact);

  return (
    <Link
      to={props.item.to}
      onClick={() => props.onNavigate?.()}
      title={t(props.item.labelKey)}
      aria-current={active() ? "page" : undefined}
      class={cn(
        "group relative flex h-10 w-full items-center rounded-lg text-sm font-medium outline-none",
        "transition-all duration-150",
        props.collapsed ? "justify-center px-0" : "gap-2 px-2",
        active()
          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15"
          : "text-sidebar-foreground/80 hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span
        class={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
          active() ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground group-hover:bg-background/50 group-hover:text-foreground",
        )}
      >
        <props.item.Icon class="h-4 w-4" />
      </span>
      <span
        class={cn(
          "truncate leading-normal",
          props.collapsed ? "hidden" : "block min-w-0 flex-1 text-left",
        )}
      >
        {t(props.item.labelKey)}
      </span>
    </Link>
  );
}

export function SideNav(props: { onNavigate?: () => void; collapsed?: boolean }) {
  const auth = useAuth();

  const items = createMemo(() =>
    MAIN_ITEMS.filter((item) => !item.minRole || hasMinRole(auth.user()?.role, item.minRole)),
  );

  const t = useT();

  return (
    <nav class="flex h-full flex-col" aria-label="Main">
      <div class="flex flex-col gap-1 px-2">
        <For each={items()}>
          {(item, index) => (
            <>
              <Show when={item.minRole && !items()[index() - 1]?.minRole}>
                <Show
                  when={!props.collapsed}
                  fallback={
                    <div class="px-3 pb-1 pt-4">
                      <span class="block h-px bg-border/80" />
                    </div>
                  }
                >
                  <div class="flex items-center gap-2 px-2 pb-1 pt-4">
                    <span class="h-px flex-1 bg-border/70" />
                    <span lang="en" class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {t("nav.admin")}
                    </span>
                    <span class="h-px flex-1 bg-border/70" />
                  </div>
                </Show>
              </Show>
              <NavLink item={item} collapsed={props.collapsed} onNavigate={props.onNavigate} />
            </>
          )}
        </For>
      </div>

      <div class="mt-auto border-t border-border px-2 py-1.5">
        <NavLink item={GUIDE_ITEM} collapsed={props.collapsed} onNavigate={props.onNavigate} />
      </div>
    </nav>
  );
}
