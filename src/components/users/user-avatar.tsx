import { Show, createEffect, createSignal } from "solid-js";
import { getUserAvatarUrl } from "@/api/users";
import { avatarRevision } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { personInitials } from "@/lib/person";

const SIZES = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
} as const;

export type UserAvatarSize = keyof typeof SIZES;

export function UserAvatar(props: {
  userId: string;
  /** Label the initials and the alt text are built from. */
  name: string;
  /**
   * Pass the profile's `avatar != null` when it is known: false skips the
   * request entirely, so a person without a photo costs no 404. Omit it where
   * the caller has no profile in hand (the sidebar) and the image is simply
   * attempted, falling back to initials if it is not there.
   */
  hasAvatar?: boolean;
  size?: UserAvatarSize;
  class?: string;
}) {
  const [broken, setBroken] = createSignal(false);

  // A once-404'd avatar must not stay broken after the person uploads one, and
  // the same component instance is reused across /profile/$userId navigations.
  createEffect(() => {
    props.userId;
    avatarRevision();
    setBroken(false);
  });

  const showImage = () => props.hasAvatar !== false && !broken();

  return (
    <span
      class={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary shadow-xs ring-1 ring-border/70 dark:bg-emerald-100 dark:text-emerald-950 dark:ring-white/20",
        SIZES[props.size ?? "sm"],
        props.class,
      )}
    >
      {personInitials(props.name)}
      <Show when={showImage()}>
        <img
          src={getUserAvatarUrl(props.userId, avatarRevision())}
          alt={props.name}
          class="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      </Show>
    </span>
  );
}
