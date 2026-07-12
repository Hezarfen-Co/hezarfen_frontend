// Admin console: every user with their personal info, a role selector, and an
// inline profile editor (the school-office path for maintaining records). The
// backend forbids changing your own role, so that selector is read-only.

import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { ProfileFields, profilePatch } from "../components/ProfileFields";
import { createAction } from "../lib/action";
import { users } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";
import { ROLES, type Role, type User } from "../lib/types";

export default function Users() {
  const { user, update, can } = useAuth();
  const [list, { mutate }] = createResource(users.list);
  const [editing, setEditing] = createSignal<string | null>(null);

  const replace = (updated: User) => {
    mutate((current) => current?.map((u) => (u.id === updated.id ? updated : u)));
    // Editing yourself must also refresh the session user (top-bar chip).
    if (updated.id === user()?.id) update(updated);
  };

  const setRole = createAction(async (target: User, role: Role) => {
    replace(await users.setRole(target.id, role));
  });

  const saveProfile = createAction(async (target: User, form: HTMLFormElement) => {
    replace(await users.updateProfile(target.id, profilePatch(form)));
    setEditing(null);
  });

  const toggleEdit = (id: string) => {
    setEditing((current) => (current === id ? null : id));
    saveProfile.clearError();
  };

  return (
    <Show when={can("admin")} fallback={<Empty>{t("adminsOnly")}</Empty>}>
      <section class="page">
        <header class="page-head">
          <div>
            <h1>{t("usersTitle")}</h1>
            <p class="sub">{t("usersSub")}</p>
          </div>
        </header>
        <ErrorLine error={setRole.error()} />
        <Show when={!list.loading} fallback={<Loading />}>
          <Show when={list()?.length} fallback={<Empty>{t("noUsers")}</Empty>}>
            <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("userCol")}</th>
                  <th>{t("idCol")}</th>
                  <th>{t("contactCol")}</th>
                  <th>{t("bornCol")}</th>
                  <th>{t("roleCol")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <For each={list()}>
                  {(entry) => (
                    <>
                      <tr>
                        <td>
                          {entry.username}
                          <Show when={entry.name || entry.surname}>
                            <br />
                            <span class="meta">
                              {[entry.name, entry.surname].filter(Boolean).join(" ")}
                            </span>
                          </Show>
                        </td>
                        <td class="mono">{entry.id}</td>
                        <td class="meta">
                          {[entry.email, entry.phone].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td class="meta">{entry.birth_date ?? "—"}</td>
                        <td>
                          <Show
                            when={entry.id !== user()?.id}
                            fallback={<em>{t("roleWord")(entry.role)}{t("you")}</em>}
                          >
                            <RoleCell
                              entry={entry}
                              pending={setRole.pending()}
                              onApply={(role) => setRole.run(entry, role)}
                            />
                          </Show>
                        </td>
                        <td>
                          <button class="ghost" onClick={() => toggleEdit(entry.id)}>
                            {editing() === entry.id ? t("close") : t("edit")}
                          </button>
                        </td>
                      </tr>
                      <Show when={editing() === entry.id}>
                        <tr>
                          <td colspan={6}>
                            <form
                              class="stack"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void saveProfile.run(entry, e.currentTarget);
                              }}
                            >
                              <p class="meta">{t("leaveEmptyToClear")}</p>
                              <ProfileFields user={entry} />
                              <ErrorLine error={saveProfile.error()} />
                              <span class="row-actions">
                                <button type="submit" disabled={saveProfile.pending()}>
                                  {t("saveProfile")}
                                </button>
                              </span>
                            </form>
                          </td>
                        </tr>
                      </Show>
                    </>
                  )}
                </For>
              </tbody>
            </table>
            </div>
          </Show>
        </Show>
      </section>
    </Show>
  );
}

/** Role dropdown that stages the pick behind Apply/Cancel — a stray scroll
 * over the select must never fire a role change on its own. */
function RoleCell(props: {
  entry: User;
  pending: boolean;
  onApply: (role: Role) => Promise<boolean>;
}) {
  const [staged, setStaged] = createSignal<Role | null>(null);
  const dirty = () => staged() !== null && staged() !== props.entry.role;

  const apply = async () => {
    const next = staged();
    if (next && (await props.onApply(next))) setStaged(null);
  };

  return (
    <span class="row-actions">
      <select
        value={staged() ?? props.entry.role}
        disabled={props.pending}
        onChange={(e) => setStaged(e.currentTarget.value as Role)}
      >
        <For each={ROLES}>
          {(role) => (
            <option value={role} selected={role === (staged() ?? props.entry.role)}>
              {t("roleWord")(role)}
            </option>
          )}
        </For>
      </select>
      <Show when={dirty()}>
        <button disabled={props.pending} onClick={() => void apply()}>
          {t("apply")}
        </button>
        <button class="ghost" disabled={props.pending} onClick={() => setStaged(null)}>
          {t("cancel")}
        </button>
      </Show>
    </span>
  );
}
