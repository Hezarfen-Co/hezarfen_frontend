import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { FloatingActionButton, type FloatingAction } from "@/components/layout/floating-action-button";
import { createNotificationFeed } from "@/components/layout/notification-feed";
import { NotificationList } from "@/components/layout/notification-list";
import { SidePanel } from "@/components/ui/side-panel";
import { IconBell, IconMessage, IconSparkles } from "@/components/ui/icons";
import { openCelebiPanel } from "@/stores/celebi-panel";
import { useModules } from "@/stores/modules-context";
import { useShellFeed } from "@/stores/shell-feed-context";
import { useT } from "@/stores/preferences-context";

/**
 * What the desktop header offers — messages, notifications, Çelebi — on a
 * phone, behind the floating action button. Notifications open in a panel
 * rather than the header's popover: a popover anchored to a button the user
 * can drag anywhere would open off screen.
 */
export function MobileQuickActions(props: { hidden: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const modules = useModules();
  const feed = useShellFeed();
  const notifications = createNotificationFeed();
  const [notificationsOpen, setNotificationsOpen] = createSignal(false);

  createEffect(() => {
    if (notificationsOpen()) notifications.refreshAll();
  });

  const actions = createMemo(() => {
    const list: FloatingAction[] = [];
    if (modules.isEnabled("messages")) {
      list.push({
        id: "messages",
        label: t("nav.messages"),
        Icon: IconMessage,
        badge: feed.unreadMessages().total,
        onSelect: () => void navigate({ to: "/messages" }),
      });
    }
    list.push({
      id: "notifications",
      label: t("notifications.title"),
      Icon: IconBell,
      badge: notifications.unreadCount(),
      onSelect: () => setNotificationsOpen(true),
    });
    if (modules.isEnabled("chatbot")) {
      list.push({ id: "celebi", label: t("ai.askCelebi"), Icon: IconSparkles, onSelect: openCelebiPanel });
    }
    return list;
  });

  return (
    <>
      {/* Unread messages are notifications too, so this one count covers both. */}
      <FloatingActionButton
        actions={actions()}
        badge={notifications.unreadCount()}
        hidden={props.hidden || notificationsOpen()}
      />
      <SidePanel
        open={notificationsOpen()}
        onOpenChange={setNotificationsOpen}
        title={t("notifications.title")}
        bodyClass="px-2 py-2"
      >
        <NotificationList
          feed={notifications}
          showTitle={false}
          scrollClass=""
          onNavigate={(url) => {
            setNotificationsOpen(false);
            void navigate({ to: url });
          }}
        />
      </SidePanel>
    </>
  );
}
