// Personal notes: list, create, edit in place, delete. Every mutation updates
// the resource from the server's response — the UI never waits on a refetch.

import { For, Show, createResource, createSignal } from "solid-js";
import { ConfirmButton } from "../components/ConfirmButton";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconEdit, IconPlus, IconTrash } from "../components/Icons";
import { createAction } from "../lib/action";
import { notes } from "../lib/api";
import { t } from "../lib/i18n";
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
          <h1>{t("notesTitle")}</h1>
          <p class="sub">{t("notesSub")}</p>
        </div>
        <button onClick={() => setCreating((open) => !open)}>
          <IconPlus /> {t("newNote")}
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
          <label>
            {t("title")}
            <input
              name="title"
              required
              maxLength={LIMITS.noteTitle}
              ref={(el) => queueMicrotask(() => el.focus())}
            />
          </label>
          <label>
            {t("content")}
            <textarea
              name="content"
              placeholder={t("writeSomething")}
              rows={3}
              maxLength={LIMITS.noteContent}
            />
          </label>
          <ErrorLine error={create.error()} />
          <span class="row-actions">
            <button type="submit" disabled={create.pending()}>
              {t("addNote")}
            </button>
            <button type="button" class="ghost" onClick={() => setCreating(false)}>
              {t("cancel")}
            </button>
          </span>
        </form>
      </Show>

      <Show when={!list.loading} fallback={<Loading />}>
        <Show
          when={list()?.length}
          fallback={
            <Empty
              action={
                <button onClick={() => setCreating(true)}>
                  <IconPlus /> {t("newNote")}
                </button>
              }
            >
              {t("noNotesYet")}
            </Empty>
          }
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
              <button class="ghost" onClick={() => setEditing(true)}>
                <IconEdit /> {t("edit")}
              </button>
            </header>
            <Show when={props.note.content}>
              <p class="prewrap">{props.note.content}</p>
            </Show>
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
          <label>
            {t("title")}
            <input name="title" value={props.note.title} required maxLength={LIMITS.noteTitle} />
          </label>
          <label>
            {t("content")}
            <textarea name="content" rows={4} maxLength={LIMITS.noteContent}>
              {props.note.content}
            </textarea>
          </label>
          <ErrorLine error={save.error() ?? remove.error()} />
          <span class="row-actions">
            <button type="submit" disabled={save.pending()}>
              {t("save")}
            </button>
            <button type="button" class="ghost" onClick={() => setEditing(false)}>
              {t("cancel")}
            </button>
            <ConfirmButton
              class="ghost danger push"
              disabled={remove.pending()}
              onConfirm={() => void remove.run()}
            >
              <IconTrash /> {t("deleteNote")}
            </ConfirmButton>
          </span>
        </form>
      </Show>
    </article>
  );
}
