// One event: view-first, with an edit toggle for its creator (or manager+),
// plus the attendance roster. Anyone marks themselves; teacher+ marks and
// removes others.

import { useNavigate, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconEdit } from "../components/Icons";
import { createAction } from "../lib/action";
import { ApiError, events } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatWindow, fromInputValue, toInputValue } from "../lib/format";
import { ATTENDANCE_STATUSES, LIMITS, type AttendanceStatus } from "../lib/types";

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [editing, setEditing] = createSignal(false);

  const [event, { mutate: setEvent }] = createResource(() => params.id, events.get);
  const [roster, { mutate: setRoster }] = createResource(() => params.id, events.attendance);

  const canManage = () => {
    const current = event();
    return current !== undefined && (current.creator === user()?.id || can("manager"));
  };
  const myStatus = () => roster()?.find((a) => a.user === user()?.id)?.status;

  const save = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setEvent(
      await events.update(params.id, {
        title: String(data.get("title")),
        description: String(data.get("description")),
        starts_at: fromInputValue(String(data.get("starts_at"))),
        ends_at: fromInputValue(String(data.get("ends_at"))),
      }),
    );
    setEditing(false);
  });

  const remove = createAction(async () => {
    await events.remove(params.id);
    navigate("/events", { replace: true });
  });

  const mark = createAction(async (status: AttendanceStatus, userId?: string) => {
    const marked = await events.mark(params.id, status, userId);
    // The backend upserts one row per (event, user); mirror that.
    setRoster((current) => [
      ...(current ?? []).filter((a) => a.user !== marked.user),
      marked,
    ]);
  });

  const unmark = createAction(async (userId: string) => {
    await events.unmark(params.id, userId);
    setRoster((current) => current?.filter((a) => a.user !== userId));
  });

  return (
    <Show
      when={event()}
      fallback={event.error ? <NotFoundMessage error={event.error} /> : <Loading />}
    >
      {(current) => (
        <section class="page">
          <header class="page-head">
            <div>
              <h1>{current().title}</h1>
              <p class="sub">{formatWindow(current().starts_at, current().ends_at)}</p>
            </div>
            <Show when={canManage()}>
              <button class="ghost" onClick={() => setEditing((open) => !open)}>
                <IconEdit /> {editing() ? "Close" : "Edit"}
              </button>
            </Show>
          </header>

          <Show when={!editing() && current().description}>
            <p class="prewrap">{current().description}</p>
          </Show>

          <Show when={editing()}>
            <form
              class="card stack"
              onSubmit={(e) => {
                e.preventDefault();
                void save.run(e.currentTarget);
              }}
            >
              <input
                name="title"
                value={current().title}
                required
                maxLength={LIMITS.eventTitle}
              />
              <textarea name="description" rows={3} maxLength={LIMITS.eventDescription}>
                {current().description}
              </textarea>
              <div class="row">
                <label>
                  Starts
                  <input
                    name="starts_at"
                    type="datetime-local"
                    value={toInputValue(current().starts_at)}
                  />
                </label>
                <label>
                  Ends
                  <input
                    name="ends_at"
                    type="datetime-local"
                    value={toInputValue(current().ends_at)}
                  />
                </label>
              </div>
              <ErrorLine error={save.error() ?? remove.error()} />
              <span class="row-actions">
                <button type="submit" disabled={save.pending()}>
                  Save
                </button>
                <button type="button" class="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  class="ghost danger push"
                  disabled={remove.pending()}
                  onClick={() => void remove.run()}
                >
                  Delete event
                </button>
              </span>
            </form>
          </Show>

          <article class="stack gap-top">
            <h2>Attendance</h2>
            <div class="row-actions">
              <For each={ATTENDANCE_STATUSES}>
                {(status) => (
                  <button
                    class={myStatus() === status ? "" : "ghost"}
                    disabled={mark.pending()}
                    onClick={() => void mark.run(status)}
                  >
                    I'm {status}
                  </button>
                )}
              </For>
            </div>

            <Show when={can("teacher")}>
              <form
                class="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  void mark.run(
                    data.get("status") as AttendanceStatus,
                    String(data.get("user_id")),
                  );
                }}
              >
                <input name="user_id" placeholder="User id" required />
                <select name="status">
                  <For each={ATTENDANCE_STATUSES}>
                    {(status) => <option value={status}>{status}</option>}
                  </For>
                </select>
                <button type="submit" disabled={mark.pending()}>
                  Mark user
                </button>
              </form>
            </Show>
            <ErrorLine error={mark.error() ?? unmark.error()} />

            <Show when={!roster.loading} fallback={<Loading />}>
              <Show when={roster()?.length} fallback={<Empty>Nobody marked yet.</Empty>}>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Status</th>
                        <Show when={can("teacher")}>
                          <th />
                        </Show>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={roster()}>
                        {(entry) => (
                          <tr>
                            <td class="mono">
                              {entry.user === user()?.id ? "you" : entry.user}
                            </td>
                            <td>
                              <span class={`badge badge-${entry.status}`}>{entry.status}</span>
                            </td>
                            <Show when={can("teacher")}>
                              <td>
                                <button
                                  class="ghost danger"
                                  disabled={unmark.pending()}
                                  onClick={() => void unmark.run(entry.user)}
                                >
                                  Remove
                                </button>
                              </td>
                            </Show>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </Show>
          </article>
        </section>
      )}
    </Show>
  );
}

function NotFoundMessage(props: { error: unknown }) {
  const message =
    props.error instanceof ApiError && props.error.status === 404
      ? "This event does not exist."
      : "Failed to load the event.";
  return <Empty>{message}</Empty>;
}
