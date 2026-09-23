import { useParams, useSearch } from "@tanstack/solid-router";
import { NoteStudioDetail } from "@/components/ai/note-studio-panel";
import { RouteGuard } from "@/components/layout/route-guard";

export default function AiStudioNotePage() {
  const params = useParams({ from: "/ai/studio/$noteId" });
  const search = useSearch({ from: "/ai/studio/$noteId" });
  return (
    <RouteGuard minRole="student">
      <NoteStudioDetail noteId={params().noteId} episode={search().episode} />
    </RouteGuard>
  );
}
