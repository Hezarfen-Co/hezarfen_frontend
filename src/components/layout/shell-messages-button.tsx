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
          class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white"
          aria-hidden="true"
        >
          {unread() > 9 ? "9+" : unread()}
        </span>
      </Show>
    </Link>
  );
}
