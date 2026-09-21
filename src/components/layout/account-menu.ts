import type { Component } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { createResource } from "@/lib/create-resource";
import type { User } from "@/api/client";
import { getMyProfile } from "@/api/users";
import { avatarRevision } from "@/lib/avatar";
import type { IconProps } from "@/components/ui/icons";
import { IconGlobe, IconGuide, IconLogout, IconSettings, IconUserCircle } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export type AccountAction = {
  id: "profile" | "settings" | "guide" | "language" | "logout";
  label: string;
  Icon: Component<IconProps>;
  onSelect: () => void;
  /** Short value shown at the row's end (the current language). */
  trailing?: string;
  destructive?: boolean;
  /** Leaves the menu open: the row changes a setting in place. */
  stays?: boolean;
};

export function accountDisplayName(user: User) {
  return user.display_name?.trim() || [user.name, user.surname].filter(Boolean).join(" ").trim() || user.username;
}

/**
 * What the account menu offers, shared by the desktop dropdown and the phone
 * sheet's account view so the two never list different things.
 */
export function createAccountMenu(options: {
  onLogout: () => void | Promise<void>;
  onOpenSettings: () => void;
  /** Runs before a route change or logout — the phone sheet closes itself. */
  onLeave?: () => void;
}) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const navigate = useNavigate();

  // The auth user carries no avatar meta, so without this the chips attempt
  // the image and 404 when there is no photo. One profile read tells them; it
  // re-reads on every avatar upload/delete via avatarRevision, and stays
  // unfetched while logged out.
  const [profile] = createResource(() => (auth.user() ? avatarRevision() : null), () => getMyProfile());
  const hasAvatar = () => {
    const p = profile();
    return p ? p.avatar !== null : false;
  };

  // Deferred so a closing menu finishes restoring focus before the route
  // changes or another overlay mounts — the race TableRowActions guards too.
  const leave = (go: () => void) => {
    setTimeout(() => {
      options.onLeave?.();
      go();
    }, 0);
  };

  const actions = (): AccountAction[] => [
    { id: "profile", label: t("profile.myProfile"), Icon: IconUserCircle, onSelect: () => leave(() => void navigate({ to: "/profile/me" })) },
    { id: "settings", label: t("nav.settings"), Icon: IconSettings, onSelect: () => setTimeout(options.onOpenSettings, 0) },
    { id: "guide", label: t("nav.guide"), Icon: IconGuide, onSelect: () => leave(() => void navigate({ to: "/guide" })) },
    {
      id: "language",
      label: t("lang.label"),
      Icon: IconGlobe,
      trailing: prefs.locale() === "tr" ? "TR" : "EN",
      stays: true,
      onSelect: () => prefs.setLocale(prefs.locale() === "tr" ? "en" : "tr"),
    },
    { id: "logout", label: t("nav.logout"), Icon: IconLogout, destructive: true, onSelect: () => leave(() => void options.onLogout()) },
  ];

  return {
    user: auth.user,
    hasAvatar,
    actions,
    openProfile: () => leave(() => void navigate({ to: "/profile/me" })),
  };
}

export type AccountMenu = ReturnType<typeof createAccountMenu>;
