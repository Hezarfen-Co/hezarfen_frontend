import { createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import { For } from "solid-js";
import type { Exam } from "@/api/types";
import { EXAM_KINDS } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconSave } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

export type ExamFormValues = {
  title: string;
  description: string;
  kind: string;
};

export function ExamForm(props: {
  initial?: Partial<Exam>;
  submitLabel?: string;
  onSubmit: (values: ExamFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [kind, setKind] = createSignal(String(props.initial?.kind ?? "homework"));
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<ExamFormValues | null>(null);
  const isEdit = () => !!props.initial?.id;

  const validate = (): string | null => {
    const value = title().trim();
    if (!value) return t("form.titleRequired");
    if (value.length > 200) return t("form.titleMax");
    if (description().length > 2000) return t("form.descriptionMax");
    return null;
  };

  const save = async (values: ExamFormValues) => {
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
      if (!isEdit()) {
        setTitle("");
        setDescription("");
        setKind("homework");
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    const values = {
      title: title().trim(),
      description: description(),
      kind: kind(),
    };
    if (isEdit()) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    await save(values);
  };

  return (
    <>
    <form class="space-y-3" onSubmit={handleSubmit}>
      <div class="space-y-1.5">
        <Label for="exam-title">{t("form.title")}</Label>
        <Input
          id="exam-title"
          class="rounded-sm"
          value={title()}
          maxlength={200}
          required
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
      </div>
      <div class="space-y-1.5">
        <Label for="exam-description">{t("form.description")}</Label>
        <Textarea
          id="exam-description"
          class="rounded-sm"
          value={description()}
          maxlength={2000}
          rows={3}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
      </div>
      <div class="space-y-1.5">
        <Label for="exam-kind">{t("exams.kind")}</Label>
        <Select
          id="exam-kind"
          class="rounded-sm"
          value={kind()}
          onChange={(e) => setKind(e.currentTarget.value)}
        >
          <For each={EXAM_KINDS}>{(k) => <option value={k}>{k}</option>}</For>
        </Select>
      </div>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending()}>
          <IconSave />
          {props.submitLabel ?? t("common.save")}
        </Button>
        {props.onCancel && (
          <Button type="button" variant="outline" onClick={props.onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
    <ConfirmDialog
      open={confirmOpen()}
      onOpenChange={setConfirmOpen}
      title={t("confirm.updateTitle")}
      summary={t("confirm.updateExam", { title: pendingValues()?.title ?? "" })}
      onConfirm={async () => {
        const values = pendingValues();
        if (!values) return;
        await save(values);
      }}
    />
    </>
  );
}
