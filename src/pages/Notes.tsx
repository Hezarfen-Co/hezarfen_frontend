// Personal notes: list, create, edit in place, delete. Every mutation updates
// the resource from the server's response — the UI never waits on a refetch.

import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconEdit, IconPlus, IconTrash } from "../components/Icons";
import { createAction } from "../lib/action";
import { notes } from "../lib/api";
import { LIMITS, type Note } from "../lib/types";

export default function Notes() {
  const [list, { mutate }] = createResource(notes.list);
  const [creating, setCreating] = createSignal(false);

  const create = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const created = await notes.create({
      title: String(data.get("title")),
      content: String(data.get("content")),
    });
    mutate((current) => [created, ...(current ?? [])]);
    form.reset();
    setCreating(false);
  });

  const replace = (updated: Note) =>
    mutate((current) => current?.map((n) => (n.id === updated.id ? updated : n)));
  const drop = (id: string) => mutate((current) => current?.filter((n) => n.id !== id));

  return (
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Notes</h1>
          <p class="sub">Your personal scratchpad — visible only to you.</p>
        </div>
        <button onClick={() => setCreating((open) => !open)}>
          <IconPlus /> New note
        </button>
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
            maxLength={LIMITS.noteTitle}
            ref={(el) => queueMicrotask(() => el.focus())}
          />
          <textarea
            name="content"
            placeholder="Write something…"
            rows={3}
            maxLength={LIMITS.noteContent}
          />
          <ErrorLine error={create.error()} />
          <span class="row-actions">
            <button type="submit" disabled={create.pending()}>
              Add note
            </button>
            <button type="button" class="ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </span>
        </form>
      </Show>

      <Show when={!list.loading} fallback={<Loading />}>
        <Show
          when={list()?.length}
          fallback={<Empty>No notes yet — write your first one.</Empty>}
        >
          <div class="grid">
            <For each={list()}>
              {(note) => <NoteCard note={note} onSaved={replace} onDeleted={drop} />}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  );
}

function NoteCard(props: {
  note: Note;
  onSaved: (note: Note) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = createSignal(false);

  const save = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    props.onSaved(
      await notes.update(props.note.id, {
        title: String(data.get("title")),
        content: String(data.get("content")),
      }),
    );
    setEditing(false);
  });

  const remove = createAction(async () => {
    await notes.remove(props.note.id);
    props.onDeleted(props.note.id);
  });

  return (
    <article class="card stack">
      <Show
        when={editing()}
        fallback={
          <>
            <header class="row">
              <h3>{props.note.title}</h3>
              <span class="row-actions">
                <button
                  class="ghost icon-btn"
                  title="Edit"
                  onClick={() => setEditing(true)}
                >
                  <IconEdit />
                </button>
                <button
                  class="ghost icon-btn danger"
                  title="Delete"
                  disabled={remove.pending()}
                  onClick={() => void remove.run()}
                >
                  <IconTrash />
                </button>
              </span>
            </header>
            <Show when={props.note.content}>
              <p class="prewrap">{props.note.content}</p>
            </Show>
            <ErrorLine error={remove.error()} />
          </>
        }
      >
        <form
          class="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save.run(e.currentTarget);
          }}
        >
          <input name="title" value={props.note.title} required maxLength={LIMITS.noteTitle} />
          <textarea name="content" rows={4} maxLength={LIMITS.noteContent}>
            {props.note.content}
          </textarea>
          <ErrorLine error={save.error()} />
          <span class="row-actions">
            <button type="submit" disabled={save.pending()}>
              Save
            </button>
            <button type="button" class="ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </span>
        </form>
      </Show>
    </article>
  );
}
