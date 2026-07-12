import { For } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleHelp } from "@/components/ui/collapsible-help";
import { Button } from "@/components/ui/button";
import { useT } from "@/stores/preferences-context";
import type { MessageKey } from "@/i18n/messages";

const STEPS: { title: MessageKey; body: MessageKey; to: string; cta: MessageKey }[] = [
  { title: "guide.step1.title", body: "guide.step1.body", to: "/", cta: "nav.home" },
  { title: "guide.step2.title", body: "guide.step2.body", to: "/notes", cta: "nav.notes" },
  { title: "guide.step3.title", body: "guide.step3.body", to: "/events", cta: "nav.events" },
  { title: "guide.step4.title", body: "guide.step4.body", to: "/courses", cta: "nav.courses" },
  { title: "guide.step5.title", body: "guide.step5.body", to: "/exams", cta: "nav.exams" },
  { title: "guide.step6.title", body: "guide.step6.body", to: "/marks", cta: "nav.marks" },
];

export default function GuidePage() {
  return (
    <RouteGuard>
      <GuideContent />
    </RouteGuard>
  );
}

function GuideContent() {
  const t = useT();

  return (
    <div class="space-y-6">
      <PageHeader
        accent="violet"
        eyebrow={t("nav.guide")}
        title={t("guide.title")}
        description={t("guide.subtitle")}
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <For each={STEPS}>
          {(step, i) => (
            <article class="surface-card relative overflow-hidden p-6">
              <div class="absolute right-4 top-4 font-display text-5xl font-semibold text-primary/10">
                {i() + 1}
              </div>
              <h2 class="font-display text-xl font-semibold">{t(step.title)}</h2>
              <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{t(step.body)}</p>
              <div class="mt-5">
                <Link to={step.to}>
                  <Button variant="outline" size="sm">
                    {t(step.cta)} →
                  </Button>
                </Link>
              </div>
            </article>
          )}
        </For>
      </div>

      <CollapsibleHelp title={t("guide.rolesTitle")}>{t("guide.rolesBody")}</CollapsibleHelp>

      <div class="hero-panel rounded-md border p-6 sm:p-8">
        <h2 class="font-display text-xl font-semibold">{t("guide.tipsTitle")}</h2>
        <ul class="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <li class="rounded-md bg-card/70 px-4 py-3">{t("guide.tip1")}</li>
          <li class="rounded-md bg-card/70 px-4 py-3">{t("guide.tip2")}</li>
          <li class="rounded-md bg-card/70 px-4 py-3">{t("guide.tip3")}</li>
          <li class="rounded-md bg-card/70 px-4 py-3">{t("guide.tip4")}</li>
        </ul>
      </div>
    </div>
  );
}
