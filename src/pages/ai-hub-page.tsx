import { Show, createMemo, createSignal } from "solid-js";
import { useNavigate, useSearch } from "@tanstack/solid-router";
import { CelebiLauncher } from "@/components/ai/celebi-launcher";
import { InsightsBoard } from "@/components/ai/insights-board";
import { NoteStudioPanel } from "@/components/ai/note-studio-panel";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { IconSparkles, IconChart, IconWaveform } from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export type AiHubTab = "studio" | "insights" | "celebi";

export default function AiHubPage() {
  return (
    <RouteGuard>
      <AiHubContent />
    </RouteGuard>
  );
}

function AiHubContent() {
  const t = useT();
  const auth = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const role = () => auth.user()?.role;
  // A parent only ever reaches their children's analysis: course notes and
  // Çelebi are not theirs to open.
  const tabs = createMemo<AiHubTab[]>(() =>
    role() === "parent" ? ["insights"] : ["studio", "insights", "celebi"],
  );
  const requested = () => (search() as { tab?: AiHubTab }).tab;
  const [tab, setTab] = createSignal<AiHubTab>(
    tabs().includes(requested() as AiHubTab) ? (requested() as AiHubTab) : tabs()[0],
  );

  const label = (value: AiHubTab) =>
    value === "studio" ? t("aiHub.tab.studio") : value === "insights" ? t("aiHub.tab.insights") : t("nav.celebi");

  return (
    <div class="space-y-5">
      <PageHeader title={t("nav.hezarfenZeka")} description={t("aiHub.description")} />
      <Tabs
        class="space-y-4"
        value={tab()}
        onChange={(value) => {
          const next = tabs().includes(value as AiHubTab) ? (value as AiHubTab) : tabs()[0];
          setTab(next);
          void navigate({ to: "/ai", search: { tab: next } });
        }}
      >
        <Show when={tabs().length > 1}>
          <TabsList class="grid w-full grid-cols-3 sm:w-fit">
            <TabsTrigger value="studio" class="min-w-0">
              <IconWaveform class="h-4 w-4" />
              {label("studio")}
            </TabsTrigger>
            <TabsTrigger value="insights" class="min-w-0">
              <IconChart class="h-4 w-4" />
              {label("insights")}
            </TabsTrigger>
            <TabsTrigger value="celebi" class="min-w-0">
              <IconSparkles class="h-4 w-4" />
              {label("celebi")}
            </TabsTrigger>
          </TabsList>
        </Show>
        <Show when={tabs().includes("studio")}>
          <TabsContent value="studio" class="mt-0 border-0 bg-transparent p-0 shadow-none">
            <NoteStudioPanel />
          </TabsContent>
        </Show>
        <TabsContent value="insights" class="mt-0 border-0 bg-transparent p-0 shadow-none">
          <InsightsBoard />
        </TabsContent>
        <Show when={tabs().includes("celebi")}>
          <TabsContent value="celebi" class="mt-0 border-0 bg-transparent p-0 shadow-none">
            <CelebiLauncher />
          </TabsContent>
        </Show>
      </Tabs>
    </div>
  );
}
