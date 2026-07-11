// Admin console: every user with their personal info, a role selector, and an
// inline profile editor (the school-office path for maintaining records). The
// backend forbids changing your own role, so that selector is read-only.

import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { ProfileFields, profilePatch } from "../components/ProfileFields";
import { createAction } from "../lib/action";
import { users } from "../lib/api";
import { useAuth } from "../lib/auth";
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
    <Show when={can("admin")} fallback={<Empty>Admins only.</Empty>}>
      <section class="page">
        <header class="page-head">
          <div>
            <h1>Users</h1>
            <p class="sub">Every account, with roles and personal records.</p>
          </div>
        </header>
        <ErrorLine error={setRole.error()} />
        <Show when={!list.loading} fallback={<Loading />}>
          <Show when={list()?.length} fallback={<Empty>No users.</Empty>}>
            <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Id</th>
                  <th>Contact</th>
                  <th>Born</th>
                  <th>Role</th>
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
                            fallback={<em>{entry.role} (you)</em>}
                          >
                            <select
                              value={entry.role}
                              disabled={setRole.pending()}
                              onChange={(e) =>
                                void setRole.run(entry, e.currentTarget.value as Role)
                              }
                            >
                              <For each={ROLES}>
                                {(role) => (
                                  <option value={role} selected={role === entry.role}>
                                    {role}
                                  </option>
                                )}
                              </For>
                            </select>
                          </Show>
                        </td>
                        <td>
                          <button class="ghost" onClick={() => toggleEdit(entry.id)}>
                            {editing() === entry.id ? "Close" : "Edit"}
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
                              <p class="meta">Leave a field empty to clear it.</p>
                              <ProfileFields user={entry} />
                              <ErrorLine error={saveProfile.error()} />
                              <span class="row-actions">
                                <button type="submit" disabled={saveProfile.pending()}>
                                  Save profile
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
