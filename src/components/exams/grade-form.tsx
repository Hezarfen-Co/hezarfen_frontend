import { For, Show, createMemo, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconCheck, IconEye } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useT } from "@/stores/preferences-context";

export type GradeFormValues = {
  user_id: string;
  mark: number;
};

export function GradeForm(props: {
  students: { id: string; label: string }[];
  onSubmit: (values: GradeFormValues) => Promise<void>;
  onViewAnswers?: (userId: string) => void;
}) {
  const t = useT();
  const [userId, setUserId] = createSignal("");
  const [mark, setMark] = createSignal("0");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<GradeFormValues | null>(null);
  const selectedStudentLabel = createMemo(() => props.students.find((student) => student.id === userId())?.label ?? userId());

  const setClampedMark = (value: string) => {
    if (value === "") {
      setMark(value);
      return;
    }
    const next = Math.max(0, Math.min(100, Number(value)));
    setMark(Number.isNaN(next) ? "" : String(Math.trunc(next)));
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const uid = userId().trim();
    const m = Number(mark());
    if (!uid) {
      setError(t("form.studentId"));
      return;
    }
    if (!Number.isInteger(m) || m < 0 || m > 100) {
      setError(t("form.markRange"));
      return;
    }
    setError("");
    setPendingValues({ user_id: uid, mark: m });
    setConfirmOpen(true);
  };

  return (
    <>
      <form class="space-y-3" onSubmit={handleSubmit}>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="grade-user">{t("form.studentId")}</Label>
            <Select
              id="grade-user"
              class="rounded-sm"
              value={userId()}
              required
              disabled={props.students.length === 0}
              onChange={(e) => setUserId(e.currentTarget.value)}
            >
              <option value="">{props.students.length === 0 ? t("form.noStudents") : t("form.selectStudent")}</option>
              <For each={props.students}>
                {(student) => <option value={student.id}>{student.label}</option>}
              </For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="grade-mark">{t("form.mark")}</Label>
            <Input
              id="grade-mark"
              class="rounded-sm"
              type="number"
              min={0}
              max={100}
              step={1}
              value={mark()}
              required
              onInput={(e) => setClampedMark(e.currentTarget.value)}
            />
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Show when={props.onViewAnswers}>
            <Button type="button" variant="outline" disabled={!userId()} onClick={() => props.onViewAnswers?.(userId())}>
              <IconEye />
              {t("exams.answerSheet")}
            </Button>
          </Show>
          <Button type="submit" disabled={pending()}>
            <IconCheck />
            {t("exams.gradeStudent")}
          </Button>
        </div>
        {error() && <p class="text-sm text-destructive">{error()}</p>}
      </form>

      <ConfirmDialog
        open={confirmOpen()}
        onOpenChange={setConfirmOpen}
        title={t("confirm.updateTitle")}
        summary={t("confirm.gradeStudent", {
          user: selectedStudentLabel(),
          mark: pendingValues()?.mark ?? 0,
        })}
        onConfirm={async () => {
          const values = pendingValues();
          if (!values) return;
          setPending(true);
          try {
            await props.onSubmit(values);
            setUserId("");
            setMark("0");
          } catch (err) {
            setError(formatApiError(err));
            throw err;
          } finally {
            setPending(false);
          }
        }}
      />
    </>
  );
}
