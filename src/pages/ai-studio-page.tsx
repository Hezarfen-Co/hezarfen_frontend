import { NoteStudioPanel } from "@/components/ai/note-studio-panel";
import { RouteGuard } from "@/components/layout/route-guard";

export default function AiStudioPage() {
  return (
    <RouteGuard minRole="student">
      <NoteStudioPanel />
    </RouteGuard>
  );
}
