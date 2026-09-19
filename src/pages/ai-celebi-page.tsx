import { CelebiLauncher } from "@/components/ai/celebi-launcher";
import { RouteGuard } from "@/components/layout/route-guard";

export default function AiCelebiPage() {
  return (
    <RouteGuard minRole="student">
      <CelebiLauncher />
    </RouteGuard>
  );
}
