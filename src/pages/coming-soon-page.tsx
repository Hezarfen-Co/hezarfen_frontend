import { useLocation } from "@tanstack/solid-router";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/stores/preferences-context";

/**
 * One route per not-yet-built module (see router.tsx's comingSoonRoutes) so
 * each has its own URL, breadcrumb and back-button target, but they all
 * render this same "not ready yet" page. The label comes from the last path
 * segment, kept in step with COMING_SOON_LABELS below and with the matching
 * sidebar entry's own labelKey in nav-items.ts.
 */
const COMING_SOON_LABELS: Record<string, MessageKey> = {
  "deneme-sinavlari": "nav.mockExams",
  "optik-okuma": "nav.opticalReading",
  raporlar: "nav.reports",
  "kvkk-denetim": "nav.dataProtection",
  "calisma-programim": "nav.studyPlan",
};

export default function ComingSoonPage() {
  return (
    <RouteGuard>
      <ComingSoonContent />
    </RouteGuard>
  );
}

function ComingSoonContent() {
  const t = useT();
  const location = useLocation();
  const slug = () => location().pathname.split("/").filter(Boolean).pop() ?? "";
  const labelKey = () => COMING_SOON_LABELS[slug()];
  const title = () => {
    const key = labelKey();
    return key ? t(key) : t("comingSoon.title");
  };

  return (
    <div class="space-y-6">
      <PageHeader title={title()} description={t("comingSoon.description")} />
      <EmptyState kind="coming-soon" title={t("comingSoon.emptyTitle")} description={t("comingSoon.emptyDescription")} />
    </div>
  );
}
