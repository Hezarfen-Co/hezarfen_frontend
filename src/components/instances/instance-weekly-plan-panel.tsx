import { Show, createSignal } from "solid-js";
import {
  deleteInstanceWeeklyPlan,
  deleteInstanceWeeklySlotById,
  postInstanceWeeklySlot,
} from "@/api/instances";
import { formatApiError, type Instance, type Limits, type MaterializeReport, type WeeklySlot } from "@/api/client";
import { MaterializePanel } from "@/components/instances/materialize-panel";
import { OverrideBadge } from "@/components/instances/override-badge";
import { WeeklyPlanTable } from "@/components/instances/weekly-plan-table";
import { WeeklySlotForm } from "@/components/instances/weekly-slot-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataSection } from "@/components/ui/data-section";
import { IconCalendarCheck, IconPlus, IconRotateCcw } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

/**
 * A section's resolved weekly plan. Editing a slot takes the plan own; the
 * reset brings the grade template's week back. Generating lessons expands
 * whichever plan resolves into dated sessions.
 */
export function InstanceWeeklyPlanPanel(props: {
  instance: Instance;
  canManage: boolean;
  /** The sessions module is on, so generated lessons have somewhere to go. */
  canGenerate: boolean;
  limits?: Limits["weekly_plan"];
  maxTopicLen?: number;
  onChanged: () => unknown;
  onLessonsCreated: (report: MaterializeReport) => void;
}) {
  const t = useT();
  const [adding, setAdding] = createSignal(false);
  const [generating, setGenerating] = createSignal(false);
  const [resetOpen, setResetOpen] = createSignal(false);
  const [error, setError] = createSignal("");
  const own = () => !props.instance.weekly_plan_inherited;

  const remove = async (slot: WeeklySlot) => {
    setError("");
    try {
      await deleteInstanceWeeklySlotById(props.instance.id, slot.id);
      await props.onChanged();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <DataSection
      title={t("weeklyPlan.title")}
      description={own() ? t("weeklyPlan.ownHint") : t("weeklyPlan.inheritedHint")}
    >
      <div class="flex items-center gap-2">
        <OverrideBadge own={own()} />
      </div>
      <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
      <WeeklyPlanTable
        slots={props.instance.weekly_plan}
        onRemove={props.canManage ? (slot) => void remove(slot) : undefined}
        actions={
          <Show when={props.canManage}>
            <Show when={own()}>
              <Button type="button" size="sm" variant="outline" onClick={() => setResetOpen(true)}>
                <IconRotateCcw class="h-4 w-4" />
                {t("override.reset")}
              </Button>
            </Show>
            <Show when={props.canGenerate}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={props.instance.weekly_plan.length === 0 || props.instance.teachers.length === 0}
                title={props.instance.teachers.length === 0 ? t("weeklyPlan.noTeacherHint") : undefined}
                onClick={() => setGenerating(true)}
              >
                <IconCalendarCheck class="h-4 w-4" />
                {t("weeklyPlan.generate")}
              </Button>
            </Show>
            <Button type="button" size="sm" onClick={() => setAdding(true)}>
              <IconPlus class="h-4 w-4" />
              {t("weeklyPlan.addSlot")}
            </Button>
          </Show>
        }
      />

      <WeeklySlotForm
        open={adding()}
        onOpenChange={setAdding}
        minMinute={props.limits?.min_slot_minute}
        maxMinute={props.limits?.max_slot_minute}
        maxTopicLen={props.maxTopicLen}
        onSubmit={async (body) => {
          await postInstanceWeeklySlot(props.instance.id, body);
          await props.onChanged();
        }}
      />
      <MaterializePanel
        instanceId={props.instance.id}
        open={generating()}
        onOpenChange={setGenerating}
        maxDays={props.limits?.max_materialize_days}
        onApplied={props.onLessonsCreated}
      />
      <ConfirmDialog
        open={resetOpen()}
        onOpenChange={setResetOpen}
        title={t("override.resetConfirmTitle")}
        description={t("override.resetConfirmHint")}
        summary={t("weeklyPlan.title")}
        confirmLabel={t("override.reset")}
        onConfirm={async () => {
          try {
            await deleteInstanceWeeklyPlan(props.instance.id);
            await props.onChanged();
          } catch (err) {
            setError(formatApiError(err));
          }
        }}
      />
    </DataSection>
  );
}
