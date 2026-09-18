import { For } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconSparkles } from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { hasMinRole } from "@/lib/roles";
import { openCelebiPanel } from "@/stores/celebi-panel";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

// Every example is a question the deployed Çelebi assistant answers for the
// role that sees it — a prompt outside the viewer's scope comes back as a
// refusal or a "please rephrase", so the sets are checked against the live bot
// rather than guessed. The manager band covers managers and admins; a student
// set is the fallback because a parent never reaches this tab.
const EXAMPLE_KEYS: Record<"student" | "teacher" | "manager", MessageKey[]> = {
  student: [
    "aiHub.celebiExample.student1",
    "aiHub.celebiExample.student2",
    "aiHub.celebiExample.student3",
  ],
  teacher: [
    "aiHub.celebiExample.teacher1",
    "aiHub.celebiExample.teacher2",
    "aiHub.celebiExample.teacher3",
  ],
  manager: [
    "aiHub.celebiExample.manager1",
    "aiHub.celebiExample.manager2",
    "aiHub.celebiExample.manager3",
  ],
};

// Çelebi itself is a shell panel — it follows the viewer across every route,
// so the hub tab opens that one panel instead of mounting a second chat.
export function CelebiLauncher() {
  const t = useT();
  const auth = useAuth();
  const examples = () => {
    const role = auth.user()?.role;
    const band = hasMinRole(role, "manager")
      ? "manager"
      : hasMinRole(role, "teacher")
        ? "teacher"
        : "student";
    return EXAMPLE_KEYS[band].map((key) => t(key));
  };

  return (
    <section class="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-10 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary-text">
        <IconSparkles class="h-6 w-6" />
      </div>
      <div class="space-y-1">
        <p class="text-base font-semibold text-text-strong">{t("ai.title")}</p>
        <p class="text-sm text-muted-foreground">{t("ai.empty")}</p>
      </div>
      <ul class="grid w-full gap-2 text-left sm:grid-cols-3">
        <For each={examples()}>
          {(example) => (
            <li class="rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-xs">
              {example}
            </li>
          )}
        </For>
      </ul>
      <Button size="sm" class="min-w-[7.5rem] rounded-lg" onClick={openCelebiPanel}>
        <IconSparkles class="h-4 w-4" />
        {t("ai.askCelebi")}
      </Button>
      <p class="text-xs text-muted-foreground">{t("aiHub.celebiHint")}</p>
    </section>
  );
}
