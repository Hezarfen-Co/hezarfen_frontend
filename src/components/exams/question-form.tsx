import { For, Index, Show, Suspense, createEffect, createResource, createSignal, lazy, untrack } from "solid-js";
import { formatApiError } from "@/api/client";
import type { ImageMeta, QuestionKind, Subject } from "@/api/client";
import { BANK_QUESTION_LIMITS, QUESTION_KINDS } from "@/api/client";
import { getSettings } from "@/api/settings";
import type { DrawScene } from "@/lib/draw-stroke";
import { Button } from "@/components/ui/button";
import { IconCheck, IconEdit, IconFileImage, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { compactChoices } from "@/lib/choice-compaction";
import { cn } from "@/lib/cn";
import { formatBytes, maxUploadBytes } from "@/lib/upload-limits";
import { useT } from "@/stores/preferences-context";

// Lazy so the drawing pad rides its own chunk, off the exam editor's initial load.
const DrawCanvas = lazy(() => import("@/components/ui/draw-canvas").then((m) => ({ default: m.DrawCanvas })));

export type QuestionValues = {
  subject_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
  image: File | null;
  choice_images: (File | null)[] | null;
  /**
   * For each surviving choice, the index it had in `initial.choices` (or -1 when
   * it was added in this edit). Blank choices are dropped on submit, so callers
   * that must re-attach per-choice server state need this old→new map.
   */
  choice_sources: number[] | null;
};

/** Shape both `ExamQuestion` and `BankQuestion` satisfy — the form only needs these. */
export type QuestionFormInitial = {
  subject: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
  image?: ImageMeta | null;
  choice_images?: (ImageMeta | null)[] | null;
};

export function QuestionForm(props: {
  initial?: QuestionFormInitial;
  subjects: Subject[];
  /** Existing stored image, as a URL the browser can GET (exam or bank path). */
  imageSrc?: string;
  choiceImageSrc?: (index: number) => string;
  /** Reload the stored image so an existing drawing can be edited, not redrawn. */
  loadImageBlob?: () => Promise<Blob>;
  submitLabel?: string;
  onSubmit: (values: QuestionValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  let textAreaRef: HTMLTextAreaElement | undefined;
  const [text, setText] = createSignal(props.initial?.text ?? "");
  const [subjectId, setSubjectId] = createSignal(props.initial?.subject ?? props.subjects[0]?.id ?? "");
  const [kind, setKind] = createSignal<QuestionKind>(props.initial?.kind ?? "choice");
  const [points, setPoints] = createSignal(String(props.initial?.points ?? 1));
  const [choices, setChoices] = createSignal<string[]>(props.initial?.choices ?? ["", "", "", ""]);
  const [correct, setCorrect] = createSignal(props.initial?.correct ?? 0);
  const [image, setImage] = createSignal<File | null>(null);
  const [drawing, setDrawing] = createSignal(false);
  const [editScene, setEditScene] = createSignal<DrawScene | null>(null);
  const [choiceImages, setChoiceImages] = createSignal<(File | null)[]>(choices().map(() => null));
  // Index each row still holds in `initial.choices` (-1 once added here), so a
  // caller can map surviving choices back to the server-side option they came from.
  const [choiceSources, setChoiceSources] = createSignal<number[]>(choices().map((_, index) => index));
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [settings] = createResource(async () => {
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });
  const maxFileBytes = () => maxUploadBytes(settings());

  // Reset on a new `initial` only — `props.subjects` may arrive after the form is
  // open (async course subjects), and re-running then would wipe what was typed.
  createEffect(() => {
    const initial = props.initial;
    untrack(() => {
      setText(initial?.text ?? "");
      setSubjectId(initial?.subject ?? props.subjects[0]?.id ?? "");
      setKind(initial?.kind ?? "choice");
      setPoints(String(initial?.points ?? 1));
      setChoices(initial?.choices ?? ["", "", "", ""]);
      setCorrect(initial?.correct ?? 0);
      setImage(null);
      setDrawing(false);
      setEditScene(null);
      setChoiceImages((initial?.choices ?? ["", "", "", ""]).map(() => null));
      setChoiceSources((initial?.choices ?? ["", "", "", ""]).map((_, index) => (initial ? index : -1)));
      setError("");
    });
  });

  // Once subjects load, preselect the first one if nothing is chosen yet.
  createEffect(() => {
    if (!subjectId()) setSubjectId(props.subjects[0]?.id ?? "");
  });

  // Blank pad for a fresh drawing; reload the stored scene to edit an existing one.
  const startDrawing = () => {
    setEditScene(null);
    setDrawing((open) => !open);
  };

  const editDrawing = async () => {
    const load = props.loadImageBlob;
    if (!props.initial?.image || !load) return;
    setError("");
    try {
      const blob = await load();
      const { pngBytesToScene } = await import("@/lib/drawing-file");
      setEditScene(pngBytesToScene(new Uint8Array(await blob.arrayBuffer())));
    } catch {
      setEditScene(null); // plain image or fetch failed → start blank, never crash
    } finally {
      setDrawing(true);
    }
  };

  const resizeTextArea = () => {
    if (!textAreaRef) return;
    textAreaRef.style.height = "auto";
    textAreaRef.style.height = `${textAreaRef.scrollHeight}px`;
  };

  createEffect(() => {
    text();
    resizeTextArea();
  });

  const setChoice = (index: number, value: string) => {
    setChoices((current) => current.map((choice, i) => (i === index ? value : choice)));
  };

  const validImage = (file: File | null): file is File => {
    if (!file) return false;
    if (file.size <= maxFileBytes()) return true;
    setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
    return false;
  };

  const setQuestionImage = (file: File | null) => {
    if (!file) {
      setImage(null);
      return;
    }
    setError("");
    if (validImage(file)) setImage(file);
  };

  const setChoiceImage = (index: number, file: File | null) => {
    if (file) {
      setError("");
      if (!validImage(file)) return;
    }
    setChoiceImages((current) => choices().map((_, i) => (i === index ? file : current[i] ?? null)));
  };

  const addChoice = () => {
    const max = BANK_QUESTION_LIMITS.maxChoices;
    setChoices((current) => (current.length >= max ? current : [...current, ""]));
    setChoiceImages((current) => (current.length >= max ? current : [...current, null]));
    setChoiceSources((current) => (current.length >= max ? current : [...current, -1]));
  };

  const removeChoice = (index: number) => {
    const remaining = choices().length - 1;
    setChoices((current) => current.filter((_, i) => i !== index));
    setChoiceImages((current) => current.filter((_, i) => i !== index));
    setChoiceSources((current) => current.filter((_, i) => i !== index));
    // Deleting a row above the answer shifts it down; deleting the answer row
    // itself moves the mark to the row that took its place (visible in the UI).
    setCorrect((current) => {
      if (index < current) return Math.max(0, current - 1);
      if (index > current) return current;
      return Math.max(0, Math.min(current, remaining - 1));
    });
  };

  const validate = (): QuestionValues | string => {
    const body = text().trim();
    const subject = subjectId().trim();
    if (!subject) return t("questions.subjectRequired");
    if (!body) return t("questions.textRequired");
    if (body.length > BANK_QUESTION_LIMITS.textMaxLen) return t("form.descriptionMax");
    const p = Number(points());
    if (!Number.isInteger(p) || p < BANK_QUESTION_LIMITS.minPoints || p > BANK_QUESTION_LIMITS.maxPoints) return t("questions.pointsRange");
    if (kind() === "text") {
      return { subject_id: subject, text: body, kind: "text", points: p, choices: null, correct: null, image: image(), choice_images: null, choice_sources: null };
    }
    const compacted = compactChoices(choices(), choiceImages(), choiceSources(), correct());
    const cleanChoices = compacted.choices;
    if (
      cleanChoices.length < BANK_QUESTION_LIMITS.minChoices ||
      cleanChoices.length > BANK_QUESTION_LIMITS.maxChoices ||
      cleanChoices.some((choice) => choice.length > BANK_QUESTION_LIMITS.choiceTextMaxLen)
    ) {
      return t("questions.choicesRange");
    }
    // The marked row survived compaction as `compacted.correct`; -1 means the user
    // blanked the very choice they had marked, so make them pick again.
    if (compacted.correct < 0) return t("questions.correctBlanked");
    return {
      subject_id: subject,
      text: body,
      kind: "choice",
      points: p,
      choices: cleanChoices,
      correct: compacted.correct,
      image: image(),
      choice_images: compacted.images,
      choice_sources: compacted.sources,
    };
  };

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const values = validate();
    if (typeof values === "string") {
      setError(values);
      return;
    }
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form class="space-y-3" onSubmit={(e) => void submit(e)}>
      <div class="rounded-lg border bg-card p-3.5 shadow-xs">
        <div class="space-y-2">
          <Label for="question-text" class="text-sm font-semibold">{t("questions.text")}</Label>
          <Textarea
            id="question-text"
            ref={textAreaRef}
            class="min-h-28 resize-none overflow-hidden bg-background text-base"
            value={text()}
            maxlength={2000}
            rows={3}
            required
            placeholder={t("questions.text")}
            onInput={(e) => {
              setText(e.currentTarget.value);
              resizeTextArea();
            }}
          />
          <div class="flex items-center gap-3">
            <Show when={props.initial?.image && props.imageSrc}>
              <div class="relative shrink-0">
                <img
                  src={props.imageSrc}
                  alt={t("questions.image")}
                  class="h-14 w-24 rounded border bg-muted/20 object-contain"
                />
              </div>
            </Show>
            <div class="flex items-center gap-2">
              <input
                id="question-image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                class="sr-only"
                onChange={(event) => setQuestionImage(event.currentTarget.files?.[0] ?? null)}
              />
              <label for="question-image" class="flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                <IconFileImage class="h-3.5 w-3.5" />
                <span class="truncate">{image()?.name ?? t("questions.image")}</span>
              </label>
              <button
                type="button"
                aria-expanded={drawing()}
                class="flex items-center gap-1.5 rounded-md border border-dashed bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                onClick={startDrawing}
              >
                <IconEdit class="h-3.5 w-3.5" />
                {t("questions.draw")}
              </button>
              <Show when={props.initial?.image && props.loadImageBlob}>
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-md border border-dashed bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  onClick={() => void editDrawing()}
                >
                  <IconEdit class="h-3.5 w-3.5" />
                  {t("questions.editDrawing")}
                </button>
              </Show>
            </div>
          </div>
          <Show when={drawing()}>
            <div class="mt-3 border-t border-border/50 pt-3">
              <Label class="mb-2 block text-xs font-semibold text-muted-foreground">{t("questions.drawTitle")}</Label>
              <Suspense fallback={<div class="h-88 animate-pulse rounded-lg border bg-muted/20" />}>
                <DrawCanvas
                  fileName="question.png"
                  initialScene={editScene()}
                  onSave={(file) => {
                    if (validImage(file)) {
                      setImage(file);
                      setDrawing(false);
                    }
                  }}
                />
              </Suspense>
            </div>
          </Show>
        </div>
      </div>

      <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-3.5 py-3 shadow-xs">
        <div class="min-w-0 flex-1 basis-40">
          <Label for="question-subject" class="mb-1 block text-xs font-semibold text-muted-foreground">{t("subjects.subject")}</Label>
          <Select id="question-subject" class="h-9 py-1.5 text-sm" value={subjectId()} required onChange={(e) => setSubjectId(e.currentTarget.value)}>
            <option value="">{t("subjects.select")}</option>
            <For each={props.subjects}>{(subject) => <option value={subject.id}>{subject.name}</option>}</For>
          </Select>
        </div>
        <div>
          <Label class="mb-1 block text-xs font-semibold text-muted-foreground">{t("questions.kind")}</Label>
          <div class="flex gap-0.5 rounded-md border bg-muted/40 p-0.5">
            <For each={QUESTION_KINDS}>
              {(k) => (
                <button
                  type="button"
                  class={cn(
                    "h-7 rounded-sm px-2.5 text-xs font-semibold transition-colors",
                    kind() === k
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setKind(k)}
                >
                  {k === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                </button>
              )}
            </For>
          </div>
        </div>
        <div class="w-20">
          <Label for="question-points" class="mb-1 block text-xs font-semibold text-muted-foreground">{t("questions.points")}</Label>
          <Input
            id="question-points"
            type="number"
            min={1}
            max={100}
            value={points()}
            class="h-9 text-sm"
            required
            onInput={(e) => setPoints(e.currentTarget.value)}
          />
        </div>
      </div>

      <Show when={kind() === "choice"}>
        <div class="rounded-lg border bg-card p-3.5 shadow-xs">
          <div class="mb-3 flex items-center justify-between gap-2 border-b border-border/50 pb-2">
            <Label class="text-sm font-semibold">{t("questions.choices")}</Label>
            <Button type="button" variant="outline" size="sm" class="h-7 gap-1 text-xs" disabled={choices().length >= 10} onClick={addChoice}>
              <IconPlus class="h-3.5 w-3.5" />
              {t("questions.addChoice")}
            </Button>
          </div>
          <div class="space-y-2">
            <Index each={choices()}>
              {(choice, index) => {
                const isCorrect = () => correct() === index;
                // Stored images are keyed by the option's ORIGINAL index, which drifts
                // from the display row once a choice is removed; -1 = added just now.
                const storedIndex = () => choiceSources()[index] ?? -1;
                const storedImage = () => (storedIndex() >= 0 ? props.initial?.choice_images?.[storedIndex()] : null);
                return (
                  <div
                    class={cn(
                      "flex items-start gap-2 rounded-md border p-2 transition-colors",
                      isCorrect() ? "border-emerald-400/60 bg-emerald-50/60" : "border-border bg-background",
                    )}
                  >
                    <button
                      type="button"
                      class={cn(
                        "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold transition-colors",
                        isCorrect()
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "border bg-background text-muted-foreground hover:border-emerald-400 hover:text-emerald-600",
                      )}
                      onClick={() => setCorrect(index)}
                      title={t("questions.correct")}
                    >
                      {isCorrect() ? <IconCheck class="h-3.5 w-3.5" /> : String.fromCharCode(65 + index)}
                    </button>
                    <div class="min-w-0 flex-1 space-y-1.5">
                      <Input
                        class="h-8 text-sm"
                        value={choice()}
                        maxlength={500}
                        placeholder={t("questions.choicePlaceholder", { index: String.fromCharCode(65 + index) })}
                        onInput={(e) => setChoice(index, e.currentTarget.value)}
                      />
                      <div class="flex items-center gap-2">
                        <input
                          id={`choice-image-${index}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          class="sr-only"
                          onChange={(event) => setChoiceImage(index, event.currentTarget.files?.[0] ?? null)}
                        />
                        <label for={`choice-image-${index}`} class="flex cursor-pointer items-center gap-1 rounded-md border border-dashed bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                          <IconFileImage class="h-3 w-3" />
                          {choiceImages()[index]?.name ?? t("questions.choiceImage")}
                        </label>
                        <Show when={storedImage() && props.choiceImageSrc}>
                          <img
                            src={props.choiceImageSrc?.(storedIndex())}
                            alt={t("questions.choiceImage")}
                            class="h-8 w-12 rounded border bg-muted/20 object-contain"
                          />
                        </Show>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={choices().length <= 2}
                      class="mt-0.5 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeChoice(index)}
                    >
                      <IconTrash class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              }}
            </Index>
          </div>
        </div>
      </Show>

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{error()}</p>}

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" class="h-8 text-xs font-semibold" disabled={pending()}>
          {props.submitLabel ?? (props.initial ? t("common.update") : t("common.create"))}
        </Button>
        <Button type="button" variant="outline" class="h-8 text-xs font-semibold" onClick={props.onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
