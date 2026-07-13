import { createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Note } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconSave } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

export type NoteFormValues = {
  title: string;
  content: string;
};

export function NoteForm(props: {
  initial?: Partial<Note>;
  submitLabel?: string;
  onSubmit: (values: NoteFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const isUpdate = () => !!props.initial?.id;
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [content, setContent] = createSignal(props.initial?.content ?? "");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<NoteFormValues | null>(null);

  const validate = (): string | null => {
    const value = title().trim();
    if (!value) return t("form.titleRequired");
    if (value.length > 200) return t("form.titleMax");
    if (content().length > 10_000) return t("form.contentMax");
    return null;
  };

  const save = async (values: NoteFormValues) => {
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
      if (!isUpdate()) {
        setTitle("");
        setContent("");
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
    const values = { title: title().trim(), content: content() };
    if (isUpdate()) {
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
          <Label for="note-title">{t("form.title")}</Label>
          <Input
            id="note-title"
            class="h-10 rounded-sm"
            value={title()}
            maxlength={200}
            required
            onInput={(e) => setTitle(e.currentTarget.value)}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="note-content">{t("form.content")}</Label>
          <Textarea
            id="note-content"
            class="min-h-28 rounded-sm"
            value={content()}
            maxlength={10000}
            rows={4}
            onInput={(e) => setContent(e.currentTarget.value)}
          />
        </div>
        {error() && <p class="text-sm text-destructive">{error()}</p>}
        <div class="flex flex-wrap items-center gap-2">
          <Button type="submit" class="h-10" disabled={pending()}>
            <IconSave />
            {props.submitLabel ?? t("common.save")}
          </Button>
          {props.onCancel && (
            <Button type="button" variant="outline" class="h-10" onClick={props.onCancel}>
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen()}
        onOpenChange={setConfirmOpen}
        title={t("confirm.updateTitle")}
        summary={t("confirm.updateNote", { title: pendingValues()?.title ?? "" })}
        onConfirm={async () => {
          const values = pendingValues();
          if (!values) return;
          await save(values);
        }}
      />
    </>
  );
}
