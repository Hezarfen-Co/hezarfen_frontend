// Event list plus creation (teacher+). Cards link to the detail page where
// editing and attendance live.

import { A } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconPlus } from "../components/Icons";
import { createAction } from "../lib/action";
import { events } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatWindow, fromInputValue } from "../lib/format";
import { LIMITS } from "../lib/types";

export default function Events() {
  const { can } = useAuth();
  const [list, { mutate }] = createResource(events.list);
  const [creating, setCreating] = createSignal(false);

  const create = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const starts = fromInputValue(String(data.get("starts_at")));
    const ends = fromInputValue(String(data.get("ends_at")));
    const created = await events.create({
      title: String(data.get("title")),
      description: String(data.get("description")),
      starts_at: starts ?? undefined,
      ends_at: ends ?? undefined,
    });
    mutate((current) => [created, ...(current ?? [])]);
    form.reset();
    setCreating(false);
  });

  return (
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Events</h1>
          <p class="sub">What's happening — open one to see or mark attendance.</p>
        </div>
        <Show when={can("teacher")}>
          <button onClick={() => setCreating((open) => !open)}>
            <IconPlus /> New event
          </button>
        </Show>
      </header>

      <Show when={creating()}>
        <form
          class="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            void create.run(e.currentTarget);
          }}
        >
          <input
            name="title"
            placeholder="Title"
            required
            maxLength={LIMITS.eventTitle}
            ref={(el) => queueMicrotask(() => el.focus())}
          />
          <textarea
            name="description"
            placeholder="Description"
            rows={2}
            maxLength={LIMITS.eventDescription}
          />
          <div class="row">
            <label>
              Starts
              <input name="starts_at" type="datetime-local" />
            </label>
            <label>
              Ends
              <input name="ends_at" type="datetime-local" />
            </label>
          </div>
          <ErrorLine error={create.error()} />
          <span class="row-actions">
            <button type="submit" disabled={create.pending()}>
              Add event
            </button>
            <button type="button" class="ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </span>
        </form>
      </Show>

      <Show when={!list.loading} fallback={<Loading />}>
        <Show when={list()?.length} fallback={<Empty>No events yet.</Empty>}>
          <div class="grid">
            <For each={list()}>
              {(event) => (
                <A href={`/events/${event.id}`} class="card link-card stack">
                  <h3>{event.title}</h3>
                  <Show when={event.description}>
                    <p class="muted clamp">{event.description}</p>
                  </Show>
                  <p class="meta">{formatWindow(event.starts_at, event.ends_at)}</p>
                </A>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  );
}
