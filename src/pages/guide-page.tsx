import { For, type Component } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  IconSparkles,
  IconNote,
  IconCalendarDays,
  IconBook,
  IconExam,
  IconCheck,
  IconUsers,
  IconSchool,
  IconReportAnalytics,
  IconClipboardCheck,
  IconUserCog,
  IconGlobe,
  IconClock,
  IconFileText,
  IconChart,
} from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

// Everything on this page is copy, so the arrays below carry message keys and
// presentation only — no literal text, in either locale.
type GuideStep = {
  id: string;
  stepNumber: string;
  borderTone: string;
  icon: Component<{ class?: string }>;
  iconColor: string;
  to: string;
};

const CARD_TONE = "border-sky-500/40 dark:border-sky-500/30 hover:border-sky-500/70 ring-1 ring-sky-500/20";
const BADGE_TONE = "border-sky-500/40 text-foreground bg-card";

const STEPS: GuideStep[] = [
  { id: "ai", stepNumber: "01", borderTone: CARD_TONE, icon: IconSparkles, iconColor: "text-sky-400", to: "/" },
  { id: "notes", stepNumber: "02", borderTone: CARD_TONE, icon: IconNote, iconColor: "text-sky-400", to: "/notes" },
  { id: "questions", stepNumber: "03", borderTone: CARD_TONE, icon: IconBook, iconColor: "text-sky-400", to: "/questions" },
  { id: "courses", stepNumber: "04", borderTone: CARD_TONE, icon: IconCalendarDays, iconColor: "text-sky-400", to: "/courses" },
  { id: "exams", stepNumber: "05", borderTone: CARD_TONE, icon: IconExam, iconColor: "text-sky-400", to: "/exams" },
  { id: "marks", stepNumber: "06", borderTone: CARD_TONE, icon: IconReportAnalytics, iconColor: "text-sky-400", to: "/marks" },
];

type RoleTab = {
  id: string;
  tabKey: MessageKey;
  icon: Component<{ class?: string }>;
  checkColor: string;
};

const ROLE_TABS: RoleTab[] = [
  { id: "student", tabKey: "role.student", icon: IconSchool, checkColor: "text-emerald-400" },
  { id: "teacher", tabKey: "role.teacher", icon: IconClipboardCheck, checkColor: "text-sky-400" },
  { id: "parent", tabKey: "role.parent", icon: IconUsers, checkColor: "text-violet-400" },
  { id: "admin", tabKey: "guide.roles.adminTab", icon: IconUserCog, checkColor: "text-amber-400" },
];

const TIPS = [
  { id: "locale", icon: IconGlobe, tone: "text-violet-400" },
  { id: "sync", icon: IconClock, tone: "text-sky-400" },
  { id: "import", icon: IconFileText, tone: "text-amber-400" },
  { id: "weights", icon: IconChart, tone: "text-emerald-400" },
] satisfies { id: string; icon: Component<{ class?: string }>; tone: string }[];

const ITEM_INDEXES = [1, 2, 3, 4] as const;

export default function GuidePage() {
  return (
    <RouteGuard>
      <GuideContent />
    </RouteGuard>
  );
}

function GuideContent() {
  const t = useT();
  const stepText = (id: string, field: string) => t(`guide.step.${id}.${field}` as MessageKey);

  return (
    <div class="space-y-6">
      <PageHeader title={t("guide.title")} description={t("guide.subtitle")} />

      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-6">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">{t("guide.roles.title")}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{t("guide.roles.subtitle")}</p>
        </div>

        <Tabs defaultValue="student" class="w-full">
          <TabsList class="w-full justify-start">
            <For each={ROLE_TABS}>
              {(role) => (
                <TabsTrigger value={role.id} class="flex-row items-center gap-2">
                  <role.icon class="h-4 w-4 shrink-0" />
                  <span class="whitespace-nowrap">{t(role.tabKey)}</span>
                </TabsTrigger>
              )}
            </For>
          </TabsList>

          <For each={ROLE_TABS}>
            {(role) => (
              <TabsContent value={role.id} class="space-y-3">
                <div class="rounded-lg border border-border/80 bg-card p-4 shadow-xs">
                  <h3 class="text-sm font-semibold text-foreground">
                    {t(`guide.roles.${role.id}.heading` as MessageKey)}
                  </h3>
                  <ul class="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <For each={ITEM_INDEXES}>
                      {(n) => (
                        <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <IconCheck class={cn("h-4 w-4 shrink-0", role.checkColor)} />
                          <span>{t(`guide.roles.${role.id}.i${n}` as MessageKey)}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </TabsContent>
            )}
          </For>
        </Tabs>
      </section>

      <section class="data-shell space-y-6 border-sky-500/15 bg-sky-500/2.5 p-6">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">{t("guide.modules.title")}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{t("guide.modules.subtitle")}</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <For each={STEPS}>
            {(step) => (
              <article
                class={cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card p-5 shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md",
                  step.borderTone,
                )}
              >
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                        BADGE_TONE,
                      )}
                    >
                      <step.icon class="h-3.5 w-3.5" />
                      {stepText(step.id, "badge")}
                    </span>
                    <span class="mono text-xs font-bold opacity-40">{step.stepNumber}</span>
                  </div>

                  <h3 class="text-base font-semibold tracking-tight text-foreground">{stepText(step.id, "title")}</h3>
                  <p class="text-xs leading-relaxed text-muted-foreground">{stepText(step.id, "description")}</p>

                  <ul class="space-y-1.5 pt-2">
                    <For each={[1, 2, 3] as const}>
                      {(n) => (
                        <li class="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <IconCheck class={cn("h-3.5 w-3.5 shrink-0", step.iconColor)} />
                          <span>{stepText(step.id, `f${n}`)}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>

                <div class="mt-5 border-t border-border/60 pt-3">
                  <Link to={step.to}>
                    <Button variant="default" size="sm" class="w-full justify-between rounded-lg text-xs">
                      <span>{stepText(step.id, "cta")}</span>
                      <span class="font-bold">→</span>
                    </Button>
                  </Link>
                </div>
              </article>
            )}
          </For>
        </div>
      </section>

      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-6">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">{t("guide.tips.title")}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{t("guide.tips.subtitle")}</p>
        </div>

        <ul class="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <For each={TIPS}>
            {(tip) => (
              <li class="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 shadow-xs">
                <span
                  class={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card",
                    tip.tone,
                  )}
                >
                  <tip.icon class="h-4 w-4" />
                </span>
                <div>
                  <p class="font-semibold text-foreground">{t(`guide.tips.${tip.id}.title` as MessageKey)}</p>
                  <p class="mt-1 leading-relaxed">{t(`guide.tips.${tip.id}.body` as MessageKey)}</p>
                </div>
              </li>
            )}
          </For>
        </ul>
      </section>
    </div>
  );
}
