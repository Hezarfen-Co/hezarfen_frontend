import { Show, createMemo } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { IconMessage } from "@/components/ui/icons";
import { useShellFeed } from "@/stores/shell-feed-context";
import { useT } from "@/stores/preferences-context";

export function ShellMessagesButton() {
  const feed = useShellFeed();
  const t = useT();
  const unread = createMemo(() => feed.unreadMessages().total);

  return (
    <Link
      to="/messages"
      class="topbar-control relative flex h-9 w-9 items-center justify-center rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${t("nav.messages")}${unread() ? `: ${unread()} ${t("rightPanel.unreadBadge")}` : ""}`}
      title={t("nav.messages")}
    >
      <IconMessage class="h-4 w-4" />
      <Show when={unread() > 0}>
        <span
          class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground ring-2 ring-background"
          aria-hidden="true"
        >
          {unread() > 9 ? "9+" : unread()}
        </span>
      </Show>
    </Link>
  );
}
