import { createSignal, createEffect, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { IconSend, IconTrash, IconX } from "@/components/ui/icons";
import { postMessage } from "@/api/messages";
import { formatApiError } from "@/api/client";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

interface GmailComposeBoxProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GmailComposeBox(props: GmailComposeBoxProps) {
  const t = useT();
  const auth = useAuth();
  const [recipient, setRecipient] = createSignal("");
  const [subject, setSubject] = createSignal("");
  const [body, setBody] = createSignal("");
  const [label, setLabel] = createSignal("");
  const [isMinimized, setIsMinimized] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");

  createEffect(() => {
    if (props.open) {
      setRecipient("");
      setSubject("");
      setBody("");
      setLabel("");
      setIsMinimized(false);
      setError("");
    }
  });

  const reset = () => {
    setRecipient("");
    setSubject("");
    setBody("");
    setLabel("");
    setError("");
  };

  const handleClose = () => {
    reset();
    props.onClose();
  };

  const handleSend = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!recipient()) {
      setError(t("messages.selectRecipient"));
      return;
    }
    setError("");
    setPending(true);

    try {
      await postMessage({
        recipient_id: recipient(),
        subject: subject().trim(),
        body: body().trim() || undefined,
        label: label().trim() || undefined,
      });
      props.onSuccess();
      handleClose();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-x-0 bottom-0 z-50 w-full rounded-t-2xl border border-border-line bg-surface-base pb-[max(env(safe-area-inset-bottom),var(--android-nav-inset,0px))] shadow-2xl shadow-black/20 transition-all duration-200 sm:inset-x-auto sm:right-6 sm:w-[560px] sm:rounded-t-xl sm:pb-0"
        style={{ "max-height": isMinimized() ? "44px" : "640px" }}
      >
        {/* Gmail Header */}
        <div class="flex h-9 items-center justify-between rounded-t-xl border-b border-border-hairline bg-surface-overlay px-4">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-primary" />
            <h3 class="min-w-0 truncate text-xs font-bold text-foreground">
              {subject() ? subject() : t("messages.newMessage")}
            </h3>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setIsMinimized(!isMinimized())}
              title={isMinimized() ? t("messages.expand") : t("messages.minimize")}
            >
              <span class="text-xs font-bold">{isMinimized() ? "□" : "—"}</span>
            </button>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text"
              onClick={handleClose}
              title={t("common.cancel")}
            >
              <IconX class="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Gmail Form Content */}
        <Show when={!isMinimized()}>
          <form class="flex h-[min(520px,60vh)] flex-col sm:h-[520px]" onSubmit={handleSend}>
            {/* Recipient Line */}
            <div class="flex items-center border-b border-border-hairline px-3 py-1.5 gap-2 text-xs">
              <span class="w-12 font-medium text-muted-foreground shrink-0">
                {t("messages.recipient")}:
              </span>
              <div class="flex-1 min-w-0">
                <UserSearchSelect
                  id="gmail-compose-recipient"
                  value={recipient()}
                  onChange={setRecipient}
                  placeholder={t("messages.recipientPlaceholder")}
                  excludeIds={auth.user()?.id ? [auth.user()!.id] : []}
                />
              </div>
            </div>

            {/* Subject Line */}
            <div class="flex items-center border-b border-border-hairline px-3 py-1 gap-2 text-xs">
              <span class="w-12 font-medium text-muted-foreground shrink-0">
                {t("form.title")}:
              </span>
              <Input
                required
                maxlength={200}
                placeholder="Konu"
                class="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs flex-1"
                value={subject()}
                onInput={(e) => setSubject(e.currentTarget.value)}
              />
            </div>

            {/* Optional Label Tag Line */}
            <div class="flex items-center border-b border-border-hairline px-3 py-1 gap-2 text-xs">
              <span class="w-12 font-medium text-muted-foreground shrink-0">
                Etiket:
              </span>
              <Input
                maxlength={50}
                placeholder={t("messages.labelsPlaceholder")}
                class="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs flex-1"
                value={label()}
                onInput={(e) => setLabel(e.currentTarget.value)}
              />
            </div>

            {/* Gmail Rich Text Editor Area */}
            <div class="flex-1 p-2.5 flex flex-col min-h-0">
              <RichTextEditor
                value={body()}
                onChange={setBody}
                placeholder={t("messages.bodyPlaceholder")}
                class="flex-1 min-h-0"
              />
            </div>

            <Show when={error()}>
              <p class="px-3 text-xs font-medium text-destructive-text">{error()}</p>
            </Show>

            {/* Gmail Bottom Action Toolbar */}
            <div class="flex items-center justify-between border-t border-border-hairline bg-surface-tint px-3 py-2.5">
              <Button
                type="submit"
                size="sm"
                class="h-9 rounded-lg px-5 font-semibold"
                disabled={pending()}
              >
                <IconSend class="mr-2 h-4 w-4" />
                {t("messages.send")}
              </Button>

              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text transition-colors"
                onClick={handleClose}
                title={t("messages.deleteDraft")}
              >
                <IconTrash class="h-4 w-4" />
              </button>
            </div>
          </form>
        </Show>
      </div>
    </Show>
  );
}
