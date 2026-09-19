import { InsightsBoard } from "@/components/ai/insights-board";
import { RouteGuard } from "@/components/layout/route-guard";

export default function AiInsightsPage() {
  return (
    <RouteGuard>
      <InsightsBoard />
    </RouteGuard>
  );
}
