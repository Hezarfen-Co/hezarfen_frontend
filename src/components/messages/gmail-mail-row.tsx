import { Show } from "solid-js";
import type { Message } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { IconArchive, IconTrash, IconMessage } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

interface GmailMailRowProps {
  message: Message;
  currentUserId?: string;
  folder: string;
  isSelected: boolean;
  onSelect: () => void;
  onArchive?: () => void;
  onTrash?: () => void;
  onDeleteForever?: () => void;
  onToggleRead?: () => void;
}

export function GmailMailRow(props: GmailMailRowProps) {
  const t = useT();

  const isSent = () => props.folder === "sent" || props.message.sender.id === props.currentUserId;
  const peer = () => (isSent() ? props.message.recipient : props.message.sender);
  const peerName = () => personLabel(peer());
  const role = () => (isSent() ? props.message.recipient_role : props.message.sender_role);
  const unread = () => !isSent() && !props.message.read;

  const formattedTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      class={cn(
        // A phone cannot fit sender, subject, snippet, date and actions on one
        // 40px line, so below sm: the row stacks and grows to a thumb-sized
        // target; from sm: up it stays the dense single line it always was.
        "group relative flex shrink-0 cursor-pointer select-none flex-col gap-0.5 border-b border-l-4 border-border-hairline px-3 py-2.5 text-xs transition-colors duration-150",
        "sm:h-10 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-0",
        unread() ? "border-l-primary bg-surface-base font-semibold text-foreground hover:bg-accent/40" : "border-l-transparent bg-surface-overlay text-muted-foreground hover:bg-muted/50",
        props.isSelected && "bg-accent/80 text-foreground"
      )}
      onClick={props.onSelect}
    >
      {/* Sender / Peer Name — carries the date too while stacked, so the first
          line reads like a message list entry on a phone. */}
      <div class="flex w-full min-w-0 items-center gap-2 sm:w-48 sm:shrink-0">
        <span
          class={cn(
            "truncate text-xs tracking-tight",
            unread() ? "font-bold text-foreground" : "font-medium text-foreground/90"
          )}
        >
          {isSent() ? `${t("messages.to")}${peerName()}` : peerName()}
        </span>
        <Show when={role()}>
          <span class="shrink-0 text-[11px] uppercase font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border-hairline">
            {t(`role.${role()}` as any)}
          </span>
        </Show>
        <span class="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground/80 sm:hidden">
          {formattedTime(props.message.sent_at)}
        </span>
      </div>

      {/* Subject + Body Snippet — a line each while stacked, joined by a dash on
          the single-line desktop row. */}
      <div class="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-2 sm:truncate">
        <span
          class={cn(
            "truncate sm:max-w-[40%] sm:shrink-0",
            unread() ? "font-bold text-foreground" : "font-semibold text-foreground/90"
          )}
        >
          {props.message.subject}
        </span>
        <span class="truncate text-[11px] text-muted-foreground/70">
          <span class="hidden sm:inline">— </span>
          {props.message.body.replace(/<[^>]*>?/gm, "").trim()}
        </span>
      </div>

      {/* Optional Tag Label */}
      <Show when={props.message.label}>
        <Badge variant="outline" class="hidden h-4 shrink-0 px-1.5 py-0 text-[11px] font-medium sm:inline-flex">
          {props.message.label}
        </Badge>
      </Show>

      {/* Right Action & Date Area — desktop only: on a phone the date moved to
          the first line, and these hover actions live in the opened message
          rather than as 24px targets crowding a list row. */}
      <div class="hidden min-w-fit shrink-0 items-center justify-end gap-2 sm:flex">
        {/* Time / Date */}
        <span class="font-mono text-[11px] text-muted-foreground/80 shrink-0">
          {formattedTime(props.message.sent_at)}
        </span>

        {/* Quick Actions (Always visible with opacity on mobile, group-hover visible on desktop) */}
        <div class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Show when={props.onArchive}>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={props.folder === "archive" ? t("messages.moveOutOfArchive") : t("messages.moveToArchive")}
              onClick={(e) => {
                e.stopPropagation();
                props.onArchive?.();
              }}
            >
              <IconArchive class="h-3.5 w-3.5" />
            </button>
          </Show>

          <Show when={props.onTrash}>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text transition-colors"
              title={props.folder === "trash" ? t("messages.restoreFromTrash") : t("messages.moveToTrash")}
              onClick={(e) => {
                e.stopPropagation();
                props.onTrash?.();
              }}
            >
              <IconTrash class="h-3.5 w-3.5" />
            </button>
          </Show>

          <Show when={props.onDeleteForever}>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text transition-colors"
              title={t("messages.deleteForever")}
              onClick={(e) => {
                e.stopPropagation();
                props.onDeleteForever?.();
              }}
            >
              <IconTrash class="h-3.5 w-3.5 text-destructive-text" />
            </button>
          </Show>

          <Show when={props.onToggleRead}>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={unread() ? t("messages.markAsRead") : t("messages.markAsUnread")}
              onClick={(e) => {
                e.stopPropagation();
                props.onToggleRead?.();
              }}
            >
              <IconMessage class="h-3.5 w-3.5" />
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
}
