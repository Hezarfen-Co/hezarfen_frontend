import { createEffect, createSignal, Show, untrack } from "solid-js";
import type { Message, MessageFolder } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { IconSend, IconTrash, IconMessage, IconArchive, IconChevronLeft, IconCheck } from "@/components/ui/icons";
import { postMessage } from "@/api/messages";
import { formatApiError } from "@/api/client";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";
import { sanitizeRichText } from "@/lib/rich-text";

interface GmailMailDetailProps {
  message: Message;
  currentUserId?: string;
  folder: string;
  onBack: () => void;
  onAction: (action: { folder?: MessageFolder; delete?: boolean; read?: boolean }) => Promise<void>;
  onSuccess: () => void;
  setFlash: (text: string) => void;
}

export function GmailMailDetail(props: GmailMailDetailProps) {
  const t = useT();
  const [isReplying, setIsReplying] = createSignal(false);
  const [replyBody, setReplyBody] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [error, setError] = createSignal("");

  const isSent = () => props.folder === "sent" || props.message.sender.id === props.currentUserId;

  // Auto-mark an opened received message as read, once per message. Gated on
  // message id (not `read`) so a manual "mark as unread" is not undone.
  let autoReadId: string | undefined;
  createEffect(() => {
    const id = props.message?.id;
    if (!id || id === autoReadId) return;
    autoReadId = id;
    untrack(() => {
      if (!isSent() && !props.message.read) {
        void props.onAction({ read: true });
      }
    });
  });

  const peer = () => (isSent() ? props.message.recipient : props.message.sender);
  const peerName = () => personLabel(peer());
  const role = () => (isSent() ? props.message.recipient_role : props.message.sender_role);

  const restoreFolder = (): MessageFolder => {
    if (isSent()) {
      return "sent";
    }
    if (
      props.message.previous_folder &&
      (props.message.previous_folder as string) !== "deleted" &&
      (props.message.previous_folder as string) !== "archive"
    ) {
      return props.message.previous_folder as MessageFolder;
    }
    return "inbox";
  };

  const formattedDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStartReply = () => {
    setIsReplying(true);
    setReplyBody("");
    setError("");
  };

  const handleSendReply = async (e: Event) => {
    e.preventDefault();
    const content = replyBody().trim();
    if (!content || sending()) return;

    setError("");
    setSending(true);

    try {
      const replySubject = props.message.subject.startsWith("Re:")
        ? props.message.subject
        : `Re: ${props.message.subject}`;

      await postMessage({
        recipient_id: peer().id,
        subject: replySubject,
        body: content,
      });

      props.setFlash(t("messages.sentToast"));
      setIsReplying(false);
      setReplyBody("");
      props.onSuccess();
    } catch (err: any) {
      setError(formatApiError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div class="flex flex-col h-full bg-background overflow-auto">
      {/* Top Gmail Navigation & Action Bar */}
      <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border-hairline bg-surface-base/90 px-3 py-2.5 backdrop-blur-xs sm:px-4">
        {/* The action set is wider than a phone, so it scrolls sideways instead
            of squeezing every button or wrapping into a second bar. */}
        <div class="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 rounded-lg text-xs"
            onClick={props.onBack}
          >
            <IconChevronLeft class="mr-1 h-4 w-4" />
            Gelen Kutusu
          </Button>

          <div class="h-4 w-px bg-border mx-1" />

          {/* Mark as Read / Unread (received messages only) */}
          <Show when={!isSent()}>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 rounded-lg text-xs"
              onClick={() => props.onAction({ read: !props.message.read })}
              title={props.message.read ? t("messages.markAsUnread") : t("messages.markAsRead")}
            >
              <Show
                when={props.message.read}
                fallback={<IconCheck class="mr-1.5 h-3.5 w-3.5" />}
              >
                <IconMessage class="mr-1.5 h-3.5 w-3.5" />
              </Show>
              {props.message.read ? t("messages.markAsUnread") : t("messages.markAsRead")}
            </Button>
          </Show>

          {/* Move to Archive Action */}
          <Show when={props.folder !== "archive" && props.folder !== "trash"}>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 rounded-lg text-xs"
              onClick={() => props.onAction({ folder: "archive" })}
              title={t("messages.moveToArchive")}
            >
              <IconArchive class="mr-1.5 h-3.5 w-3.5" />
              {t("messages.moveToArchive")}
            </Button>
          </Show>

          {/* Restore out of Archive */}
          <Show when={props.folder === "archive"}>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 rounded-lg text-xs"
              onClick={() => props.onAction({ folder: restoreFolder() })}
              title={t("messages.moveOutOfArchive")}
            >
              <IconArchive class="mr-1.5 h-3.5 w-3.5" />
              {t("messages.moveOutOfArchive")}
            </Button>
          </Show>

          {/* Restore out of Trash */}
          <Show when={props.folder === "trash"}>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 rounded-lg text-xs"
              onClick={() => props.onAction({ folder: restoreFolder() })}
              title={t("messages.restoreFromTrash")}
            >
              <IconMessage class="mr-1.5 h-3.5 w-3.5" />
              {t("messages.restoreFromTrash")}
            </Button>
          </Show>

          {/* Move to Trash Action */}
          <Show when={props.folder !== "trash"}>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
              onClick={() => props.onAction({ folder: "trash" })}
              title={t("messages.moveToTrash")}
            >
              <IconTrash class="mr-1.5 h-3.5 w-3.5" />
              {t("messages.moveToTrash")}
            </Button>
          </Show>

          {/* Permanent Delete Action */}
          <Show when={props.folder === "trash"}>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
              onClick={() => props.onAction({ delete: true })}
              title={t("messages.deleteForever")}
            >
              <IconTrash class="mr-1.5 h-3.5 w-3.5" />
              {t("messages.deleteForever")}
            </Button>
          </Show>
        </div>

        <div class="hidden shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground sm:flex">
          <span>{formattedDate(props.message.sent_at)}</span>
        </div>
      </div>

      {/* Main Mail Content View Container */}
      <div class="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Email Subject Title Header */}
        <div class="flex items-center justify-between gap-3 border-b border-border-hairline pb-4">
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold tracking-tight text-foreground">
              {props.message.subject}
            </h1>
            <Show when={props.message.label}>
              <Badge variant="secondary" class="text-xs">
                {props.message.label}
              </Badge>
            </Show>
          </div>
        </div>

        {/* Sender Info Card */}
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-sm text-primary-foreground">
              {peerName().charAt(0).toUpperCase()}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-foreground">
                  {peerName()}
                </span>
                <Show when={role()}>
                  <Badge variant="outline" class="text-[9px] font-mono uppercase">
                    {t(`role.${role()}` as any)}
                  </Badge>
                </Show>
              </div>
              <p class="text-xs text-muted-foreground">
                {isSent() ? `${t("messages.to")}: ` : `${t("messages.from")}: `}
                <span class="font-medium text-foreground">{peerName()}</span>
              </p>
            </div>
          </div>

          <Show when={!isSent()}>
            <Button
              variant="outline"
              size="sm"
              class="h-8 rounded-lg text-xs"
              onClick={handleStartReply}
            >
              <IconMessage class="mr-1.5 h-3.5 w-3.5" />
              {t("messages.reply")}
            </Button>
          </Show>
        </div>

        {/* Email Body Card */}
        <div class="rounded-xl border border-border-line bg-surface-base p-6 leading-relaxed text-sm text-foreground/90 whitespace-pre-wrap min-h-[140px]">
          <div innerHTML={sanitizeRichText(props.message.body)} />
        </div>

        {/* Gmail Style Inline Reply Area */}
        <Show when={!isSent()}>
          <div class="pt-4 border-t border-border-hairline">
            <Show
              when={isReplying()}
              fallback={
                /* Gmail Quick Action Pills */
                <div class="flex items-center gap-3">
                  <Button
                    variant="outline"
                    class="rounded-lg px-5 h-9 text-xs font-semibold hover:bg-accent"
                    onClick={handleStartReply}
                  >
                    <IconMessage class="mr-2 h-4 w-4" />
                    {t("messages.reply")}
                  </Button>
                </div>
              }
            >
              {/* Gmail Inline Reply Editor */}
              <form
                onSubmit={handleSendReply}
                class="rounded-xl border border-border-line bg-surface-base p-4 shadow-xs space-y-3"
              >
                <div class="flex items-center justify-between text-xs border-b border-border-hairline pb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-foreground">{t("messages.replyTo")}</span>
                    <Badge variant="secondary" class="text-xs font-medium">
                      {peerName()}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    class="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsReplying(false)}
                  >
                    {t("common.cancel")}
                  </button>
                </div>

                <RichTextEditor
                  value={replyBody()}
                  onChange={setReplyBody}
                  placeholder={t("messages.replyPlaceholder")}
                  minHeight="min-h-[120px]"
                />

                <Show when={error()}>
                  <p class="text-xs font-medium text-destructive">{error()}</p>
                </Show>

                <div class="flex items-center justify-between pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    class="rounded-lg px-5 h-9 font-semibold"
                    disabled={sending() || !replyBody().trim()}
                  >
                    <IconSend class="mr-2 h-4 w-4" />
                    {t("messages.send")}
                  </Button>

                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setIsReplying(false)}
                    title={t("common.cancel")}
                  >
                    <IconTrash class="h-4 w-4" />
                  </button>
                </div>
              </form>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
