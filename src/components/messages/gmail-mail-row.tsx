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
        "group relative flex h-10 items-center gap-3 border-b border-border/60 border-l-4 px-4 py-0 text-xs transition-colors duration-150 cursor-pointer select-none shrink-0",
        unread() ? "border-l-primary bg-card font-semibold text-foreground hover:bg-accent/40" : "border-l-transparent bg-background/60 text-muted-foreground hover:bg-muted/50",
        props.isSelected && "bg-accent/80 text-foreground"
      )}
      onClick={props.onSelect}
    >
      {/* Sender / Peer Name */}
      <div class="flex items-center gap-2 w-48 shrink-0 min-w-0">
        <span
          class={cn(
            "truncate text-xs tracking-tight",
            unread() ? "font-bold text-foreground" : "font-medium text-foreground/90"
          )}
        >
          {isSent() ? `${t("messages.to")}${peerName()}` : peerName()}
        </span>
        <Show when={role()}>
          <span class="shrink-0 text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/50">
            {t(`role.${role()}` as any)}
          </span>
        </Show>
      </div>

      {/* Subject + Body Snippet (Gmail Single Line) */}
      <div class="min-w-0 flex-1 flex items-center gap-2 truncate">
        <span
          class={cn(
            "truncate shrink-0 max-w-[40%]",
            unread() ? "font-bold text-foreground" : "font-semibold text-foreground/90"
          )}
        >
          {props.message.subject}
        </span>
        <span class="text-muted-foreground/70 truncate text-[11px]">
          — {props.message.body.replace(/<[^>]*>?/gm, "").trim()}
        </span>
      </div>

      {/* Optional Tag Label */}
      <Show when={props.message.label}>
        <Badge variant="outline" class="text-[9px] h-4 px-1.5 py-0 font-medium shrink-0">
          {props.message.label}
        </Badge>
      </Show>

      {/* Fixed-width & Fixed-height Right Action Area */}
      <div class="shrink-0 w-24 h-full flex items-center justify-end">
        {/* Time / Date (Default View) */}
        <div class="font-mono text-[11px] text-muted-foreground text-right group-hover:hidden">
          {formattedTime(props.message.sent_at)}
        </div>

        {/* Gmail Hover Quick Action Bar (Hover View - Fixed h-6 buttons to fit h-10 row cleanly) */}
        <div class="hidden items-center justify-end gap-1 group-hover:flex">
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
              class="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title={props.folder === "trash" ? "Çöp Kutusundan Çıkar" : t("messages.moveToTrash")}
              onClick={(e) => {
                e.stopPropagation();
                props.onTrash?.();
              }}
            >
              <IconTrash class="h-3.5 w-3.5" />
            </button>
          </Show>

          <Show when={props.onToggleRead}>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={unread() ? "Okundu olarak işaretle" : "Okunmadı olarak işaretle"}
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
