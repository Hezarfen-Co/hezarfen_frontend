import { useLocation } from "@tanstack/solid-router";
import { Show, Suspense, createMemo } from "solid-js";
import { getNoteById } from "@/api/notes";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { NoteDocument } from "@/components/notes/note-document";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createResource } from "@/lib/create-resource";

/** `/notes/new` and `/notes/$id` — the router remounts this page per note. */
export default function NoteEditorPage() {
  const location = useLocation();
  const id = createMemo(() => {
    const match = /^\/notes\/([^/]+)$/.exec(location().pathname);
    return match && match[1] !== "new" ? decodeURIComponent(match[1]) : null;
  });
  const [note, { refetch }] = createResource(id, (noteId) => getNoteById(noteId));

  return (
    <RouteGuard>
      <Show when={id()} fallback={<NoteDocument />}>
        <Suspense fallback={<PageSpinner />}>
          <Show when={!note.error} fallback={<ErrorAlert message={formatApiError(note.error)} onRetry={() => void refetch()} />}>
            <Show when={note()}>{(loaded) => <NoteDocument note={loaded()} />}</Show>
          </Show>
        </Suspense>
      </Show>
    </RouteGuard>
  );
}
