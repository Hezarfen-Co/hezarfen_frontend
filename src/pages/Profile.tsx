// The caller's own account: fixed facts (username, role, id) plus the editable
// personal info. Saving patches /users/me and refreshes the session user, so
// the sidebar chip updates instantly.

import { Show, createSignal } from "solid-js";
import { ErrorLine } from "../components/Feedback";
import { ProfileFields, profilePatch } from "../components/ProfileFields";
import { createAction } from "../lib/action";
import { users } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Profile() {
  const { user, update } = useAuth();
  const [saved, setSaved] = createSignal(false);

  const save = createAction(async (form: HTMLFormElement) => {
    setSaved(false);
    update(await users.updateMyProfile(profilePatch(form)));
    setSaved(true);
  });

  return (
    <Show when={user()}>
      {(current) => (
        <section class="page">
          <header class="page-head">
            <div class="row">
              <span class="avatar avatar-lg">
                {(current().name ?? current().username).slice(0, 1)}
              </span>
              <div>
                <h1>
                  {[current().name, current().surname].filter(Boolean).join(" ") ||
                    current().username}
                </h1>
                <p class="sub">
                  {current().username} · <span class="badge">{current().role}</span> ·{" "}
                  <span class="mono">{current().id}</span>
                </p>
              </div>
            </div>
          </header>

          <form
            class="card stack"
            onSubmit={(e) => {
              e.preventDefault();
              void save.run(e.currentTarget);
            }}
          >
            <h2>Personal info</h2>
            <p class="meta">Leave a field empty to clear it.</p>
            <ProfileFields user={current()} />
            <ErrorLine error={save.error()} />
            <span class="row-actions">
              <button type="submit" disabled={save.pending()}>
                Save
              </button>
              <Show when={saved() && !save.pending()}>
                <span class="meta">Saved.</span>
              </Show>
            </span>
          </form>
        </section>
      )}
    </Show>
  );
}
