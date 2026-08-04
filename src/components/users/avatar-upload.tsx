import { Show, createResource, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import { getLimits } from "@/api/limits";
import { deleteMyAvatar, postMyAvatar } from "@/api/users";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconEdit, IconTrash, IconUploadCloud } from "@/components/ui/icons";
import { UserAvatar } from "@/components/users/user-avatar";
import { AVATAR_ACCEPT, AVATAR_CONTENT_TYPES, bumpAvatarRevision, formatBytes } from "@/lib/avatar";
import { useT } from "@/stores/preferences-context";

export function AvatarUpload(props: {
  userId: string;
  name: string;
  hasAvatar: boolean;
  /** Re-read the profile so `avatar` reflects what was just written. */
  onChanged: () => void | Promise<void>;
}) {
  const t = useT();
  const [limits] = createResource(() => getLimits());
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [removeOpen, setRemoveOpen] = createSignal(false);
  let input: HTMLInputElement | undefined;

  const maxBytes = () => limits.latest?.file.default_max_file_bytes ?? 5 * 1024 * 1024;

  const pick = async (file: File) => {
    setError("");
    if (!AVATAR_CONTENT_TYPES.includes(file.type)) {
      setError(t("avatar.typeInvalid"));
      return;
    }
    if (file.size > maxBytes()) {
      setError(t("avatar.tooLarge", { size: formatBytes(maxBytes()) }));
      return;
    }
    setBusy(true);
    try {
      await postMyAvatar(file);
      bumpAvatarRevision();
      await props.onChanged();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError("");
    setBusy(true);
    try {
      await deleteMyAvatar();
      bumpAvatarRevision();
      await props.onChanged();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="space-y-1.5">
      {/* The photo controls hang off the avatar itself rather than sitting
          beside it as a row of buttons, so the header reads as a person, not
          as a form. */}
      <div class="relative w-fit">
        <UserAvatar userId={props.userId} name={props.name} hasAvatar={props.hasAvatar} size="xl" />
        <DropdownMenu placement="bottom-start" gutter={6}>
          <DropdownMenuTrigger
            class="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-card bg-primary text-primary-foreground shadow-sm outline-hidden transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            disabled={busy()}
            aria-label={t("avatar.title")}
          >
            <IconEdit class="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-56">
            <DropdownMenuItem class="gap-2.5 rounded-lg" onSelect={() => input?.click()}>
              <IconUploadCloud class="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{props.hasAvatar ? t("avatar.change") : t("avatar.upload")}</span>
            </DropdownMenuItem>
            <Show when={props.hasAvatar}>
              <DropdownMenuItem destructive class="gap-2.5 rounded-lg" onSelect={() => setRemoveOpen(true)}>
                <IconTrash class="h-4 w-4 shrink-0" />
                <span>{t("avatar.remove")}</span>
              </DropdownMenuItem>
            </Show>
            <p class="px-2 pb-1.5 pt-1 text-[11px] leading-snug text-muted-foreground">
              {t("avatar.hint", { size: formatBytes(maxBytes()) })}
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Show when={error()}>
        <p class="max-w-40 text-xs text-destructive">{error()}</p>
      </Show>

      <input
        ref={input}
        type="file"
        accept={AVATAR_ACCEPT}
        class="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          // Clear it before awaiting, so picking the same file twice in a row
          // still fires a change event.
          e.currentTarget.value = "";
          if (file) void pick(file);
        }}
      />

      <ConfirmDialog
        open={removeOpen()}
        onOpenChange={setRemoveOpen}
        title={t("avatar.remove")}
        summary={t("avatar.removeConfirm")}
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  );
}
