import { Show, createEffect, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconBell } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createNotificationFeed } from "@/components/layout/notification-feed";
import { NotificationList } from "@/components/layout/notification-list";
import { useT } from "@/stores/preferences-context";

/** The header bell: the notification list in a popover. */
export function NotificationCenter() {
  const t = useT();
  const navigate = useNavigate();
  const feed = createNotificationFeed();
  const [open, setOpen] = createSignal(false);

  createEffect(() => {
    if (open()) feed.refreshAll();
  });

  const unreadCount = feed.unreadCount;
  let panel: HTMLDivElement | undefined;

  return (
    <Popover
      open={open()}
      onOpenChange={setOpen}
      placement="bottom-end"
      gutter={8}
    >
      <PopoverTrigger
        class={cn(
          "topbar-control relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          open() && "bg-muted text-foreground"
        )}
        title={t("notifications.title")}
        aria-label={t("notifications.title")}
      >
        <IconBell class="h-4 w-4" />
        <Show when={unreadCount() > 0}>
          <span class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground ring-2 ring-background">
            {unreadCount() > 9 ? "9+" : unreadCount()}
          </span>
        </Show>
      </PopoverTrigger>

      {/* Focus lands on the popover itself, not its first control: that is
          "Tümünü sil", and one Enter would clear the whole list. */}
      <PopoverContent
        class="w-80 sm:w-96 rounded-xl border border-border-line bg-surface-base p-0 shadow-2xl overflow-hidden"
        ref={(el: HTMLDivElement) => {
          panel = el;
        }}
        tabIndex={-1}
        aria-label={t("notifications.title")}
        onOpenAutoFocus={(event: Event) => {
          event.preventDefault();
          panel?.focus();
        }}
      >
        <NotificationList
          feed={feed}
          onNavigate={(url) => {
            setOpen(false);
            void navigate({ to: url });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
