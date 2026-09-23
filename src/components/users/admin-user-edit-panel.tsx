import { Show } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getLimits } from "@/api/limits";
import { getSettings } from "@/api/settings";
import { getUserProfile, patchUserProfile } from "@/api/users";
import type { User } from "@/api/client";
import { ProfileForm } from "@/components/users/profile-form";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { useT } from "@/stores/preferences-context";

/**
 * The admin's edit form for one account (name, contact, branş, student
 * number, display name/bio). One component for the admin user detail header
 * and the users list's row menu, so both send the same PATCH. It reads the
 * profile (display name, bio, branş live only there), the branş vocabulary and
 * the field limits only while open, and mounts the form once they are in:
 * ProfileForm reads its initial values once. The caller closes it and
 * refetches in `onSaved`.
 */
export function AdminUserEditPanel(props: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useT();
  const openId = () => (props.open && props.user ? props.user.id : null);
  const [profile] = createResource(openId, (userId) => getUserProfile(userId).catch(() => null));
  const [settings] = createResource(() => (props.open ? true : null), () => getSettings().catch(() => null));
  const [limits] = createResource(() => (props.open ? true : null), () => getLimits().catch(() => null));

  // `.latest` suspends until a first value, which would blank the page's own
  // Suspense boundary; the form waits for all three reads instead.
  const settled = (res: { state: string }) => res.state === "ready" || res.state === "errored";
  const ready = () => settled(profile) && settled(settings) && settled(limits);

  return (
    <SidePanel guardUnsaved open={props.open && !!props.user} onOpenChange={props.onOpenChange} title={t("profile.edit")} description={props.user?.username}>
      <Show when={props.user} keyed>
        {(user) => (
          <Show when={ready()} fallback={<PageSpinner />}>
            <ProfileForm
              user={user}
              profile={profile.latest ? { display_name: profile.latest.display_name, bio: profile.latest.bio, branch: profile.latest.branch } : undefined}
              branches={settings.latest?.branches}
              editStudentNumber
              maxStudentNumberLen={limits.latest?.user.max_student_number_len}
              maxAddressLen={limits.latest?.user.max_address_len}
              onSave={(body) => patchUserProfile(user.id, body)}
              onSaved={() => void props.onSaved()}
            />
          </Show>
        )}
      </Show>
    </SidePanel>
  );
}
