import { RagStudyPanel } from "@/components/rag/rag-study-panel";
import { RouteGuard } from "@/components/layout/route-guard";

export default function AiStudyPage() {
  return (
    <RouteGuard minRole="student">
      <RagStudyPanel />
    </RouteGuard>
  );
}
