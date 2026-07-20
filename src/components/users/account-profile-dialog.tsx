import { Show } from "solid-js";
import { FormDialog } from "@/components/ui/form-dialog";
import { ProfileForm } from "@/components/users/profile-form";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export function AccountProfileDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useAuth();
  const t = useT();

  return (
    <Show when={auth.user()} keyed>
      {(user) => (
        <FormDialog open={props.open} onOpenChange={props.onOpenChange} title={user.username} description={t("profile.edit")}>
          <ProfileForm
            user={user}
            onSaved={async () => {
              await auth.refresh();
              props.onOpenChange(false);
            }}
          />
        </FormDialog>
      )}
    </Show>
  );
}
