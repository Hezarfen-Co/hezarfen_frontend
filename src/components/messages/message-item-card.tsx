import { Show } from "solid-js";
import type { Message } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

interface MessageItemCardProps {
  message: Message;
  currentUserId?: string;
  folder: string;
  isSelected: boolean;
  onSelect: () => void;
}

export function MessageItemCard(props: MessageItemCardProps) {
  const t = useT();

  const isSent = () => props.folder === "sent" || props.message.sender.id === props.currentUserId;
  const peer = () => (isSent() ? props.message.recipient : props.message.sender);
  const peerName = () => personLabel(peer());
  const role = () => (isSent() ? props.message.recipient_role : props.message.sender_role);
  const unread = () => !isSent() && !props.message.read;

  const initial = () => {
    const name = peerName().trim();
    return name.charAt(0).toUpperCase() || "?";
  };

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
    <button
      type="button"
      class={cn(
        "group relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150",
        props.isSelected
          ? "border-primary/50 bg-accent/60 shadow-xs ring-1 ring-primary/20"
          : unread()
            ? "border-primary/30 bg-primary/[0.03] hover:border-primary/40 hover:bg-accent/40"
            : "border-border/60 bg-card hover:border-border hover:bg-muted/40"
      )}
      onClick={props.onSelect}
    >
      {/* Avatar */}
      <div class="relative shrink-0">
        <div
          class={cn(
            "flex h-10 w-10 items-center justify-center rounded-full font-bold text-xs shadow-xs",
            unread()
              ? "bg-primary text-primary-foreground font-extrabold"
              : "bg-muted text-muted-foreground border border-border"
          )}
        >
          {initial()}
        </div>
        <Show when={unread()}>
          <span class="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
        </Show>
      </div>

      {/* Message Info */}
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <span
              class={cn(
                "truncate text-xs font-semibold tracking-tight",
                unread() ? "text-foreground font-bold" : "text-foreground/90"
              )}
            >
              {peerName()}
            </span>
            <Show when={role()}>
              <span class="shrink-0 text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/50">
                {t(`role.${role()}` as any)}
              </span>
            </Show>
          </div>
          <span class="shrink-0 font-mono text-[10px] text-muted-foreground">
            {formattedTime(props.message.sent_at)}
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <Show when={isSent()}>
            <span class="text-[10px] font-medium text-muted-foreground shrink-0">
              {t("messages.to")}:
            </span>
          </Show>
          <p
            class={cn(
              "truncate text-xs tracking-tight",
              unread() ? "font-bold text-foreground" : "font-medium text-foreground/80"
            )}
          >
            {props.message.subject}
          </p>
        </div>

        <p class="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/90">
          {props.message.body}
        </p>

        <Show when={props.message.label}>
          <div class="pt-0.5">
            <Badge variant="outline" class="text-[9px] h-4 px-1.5 py-0 font-medium">
              {props.message.label}
            </Badge>
          </div>
        </Show>
      </div>
    </button>
  );
}
