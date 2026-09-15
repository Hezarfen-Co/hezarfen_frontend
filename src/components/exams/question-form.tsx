import { For, Index, Show, Suspense, createEffect, createSignal, lazy, untrack } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { formatApiError } from "@/api/client";
import type { Choice, ImageMeta, QuestionKind, Subject } from "@/api/client";
import { BANK_QUESTION_LIMITS, QUESTION_KINDS } from "@/api/client";
import { getSettings } from "@/api/settings";
import type { DrawScene } from "@/lib/draw-stroke";
import { Button } from "@/components/ui/button";
import { IconCheck, IconEdit, IconFileImage, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addChoice as addChoiceRow,
  blankChoiceSet,
  removeChoice as removeChoiceRow,
  setChoiceImage as setChoiceImageIn,
  setChoiceText,
  setCorrect as setCorrectIn,
  storedChoiceSet,
  submitChoices,
  type ChoiceSet,
} from "@/lib/choice-set";
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
  /** Each row keeps its key: a stored id keeps that option, a `new:` id is a new one. */
  choices: Choice[] | null;
  /** Choice id, never an index. */
  correct: string | null;
  image: File | null;
  /** Freshly picked files, aligned to `choices`. */
  choice_images: (File | null)[] | null;
};

/** Shape both `ExamQuestion` and `BankQuestion` satisfy — the form only needs these. */
export type QuestionFormInitial = {
  /** Null for a bank template whose origin subject has since been deleted. */
  subject: string | null;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: Choice[] | null;
  correct: string | null;
  image?: ImageMeta | null;
  choice_images?: (ImageMeta | null)[] | null;
};

export function QuestionForm(props: {
  initial?: QuestionFormInitial;
  subjects: Subject[];
  /** True while `subjects` is still loading, so a missing subject is not misreported. */
  subjectsPending?: boolean;
  /** Existing stored image, as a URL the browser can GET (exam or bank path). */
  imageSrc?: string;
  choiceImageSrc?: (choiceId: string) => string;
  /** Reload the stored image so an existing drawing can be edited, not redrawn. */
  loadImageBlob?: () => Promise<Blob>;
  submitLabel?: string;
  onSubmit: (values: QuestionValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  let textAreaRef: HTMLTextAreaElement | undefined;
  const [text, setText] = createSignal(props.initial?.text ?? "");
  // No first-subject default: the subject is submitted, so the user picks it.
  const [subjectId, setSubjectId] = createSignal(props.initial?.subject ?? "");
  const [kind, setKind] = createSignal<QuestionKind>(props.initial?.kind ?? "choice");
  const [points, setPoints] = createSignal(String(props.initial?.points ?? 1));
  const [choiceSet, setChoiceSet] = createSignal<ChoiceSet>(
    props.initial ? storedChoiceSet(props.initial.choices, props.initial.correct) : blankChoiceSet(),
  );
  const [image, setImage] = createSignal<File | null>(null);
  const [drawing, setDrawing] = createSignal(false);
  const [editScene, setEditScene] = createSignal<DrawScene | null>(null);
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
      setSubjectId(initial?.subject ?? "");
      setKind(initial?.kind ?? "choice");
      setPoints(String(initial?.points ?? 1));
      setChoiceSet(initial ? storedChoiceSet(initial.choices, initial.correct) : blankChoiceSet());
      setImage(null);
      setDrawing(false);
      setEditScene(null);
      setError("");
    });
  });

  // The stored subject is not in the list this user can pick from (foreign course,
  // or they lost access to it). Never swap it silently — show it, and make them pick.
  const subjectUnavailable = () => {
    const current = props.initial?.subject;
    return (
      !!current &&
      !props.subjectsPending &&
      subjectId() === current &&
      !props.subjects.some((subject) => subject.id === current)
    );
  };

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

  const rows = () => choiceSet().rows;
  // Stored option images arrive as an array aligned to `initial.choices`, so look
  // one up by the row's id — the row's display position may have moved.
  const storedImage = (id: string) => {
    const index = props.initial?.choices?.findIndex((choice) => choice.id === id) ?? -1;
    return index >= 0 ? props.initial?.choice_images?.[index] ?? null : null;
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

  const addChoice = () => setChoiceSet((set) => addChoiceRow(set, BANK_QUESTION_LIMITS.maxChoices));
  const removeChoice = (id: string) => setChoiceSet((set) => removeChoiceRow(set, id));
  const setChoice = (id: string, value: string) => setChoiceSet((set) => setChoiceText(set, id, value));
  const setCorrect = (id: string) => setChoiceSet((set) => setCorrectIn(set, id));

  const setChoiceImage = (id: string, file: File | null) => {
    if (file) {
      setError("");
      if (!validImage(file)) return;
    }
    setChoiceSet((set) => setChoiceImageIn(set, id, file));
  };

  const validate = (): QuestionValues | string => {
    const body = text().trim();
    const subject = subjectId().trim();
    if (!subject) return t("questions.subjectRequired");
    if (subjectUnavailable()) return t("questions.subjectUnavailableHelp");
    if (!body) return t("questions.textRequired");
    if (body.length > BANK_QUESTION_LIMITS.textMaxLen) return t("form.descriptionMax");
    const p = Number(points());
    if (!Number.isInteger(p) || p < BANK_QUESTION_LIMITS.minPoints || p > BANK_QUESTION_LIMITS.maxPoints) return t("questions.pointsRange");
    if (kind() === "text") {
      return { subject_id: subject, text: body, kind: "text", points: p, choices: null, correct: null, image: image(), choice_images: null };
    }
    const submitted = submitChoices(choiceSet());
    if (
      submitted.choices.length < BANK_QUESTION_LIMITS.minChoices ||
      submitted.choices.length > BANK_QUESTION_LIMITS.maxChoices ||
      submitted.choices.some((choice) => choice.text.length > BANK_QUESTION_LIMITS.choiceTextMaxLen)
    ) {
      return t("questions.choicesRange");
    }
    // Nothing is marked for the user: either they never picked, or they blanked
    // the row they had picked. Both end here, and both need a deliberate pick.
    if (!submitted.correct) return t("questions.correctRequired");
    return {
      subject_id: subject,
      text: body,
      kind: "choice",
      points: p,
      choices: submitted.choices,
      correct: submitted.correct,
      image: image(),
      choice_images: submitted.images,
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
            <Show when={subjectUnavailable()}>
              <option value={props.initial?.subject ?? ""} disabled>{t("questions.subjectUnavailable")}</option>
            </Show>
            <For each={props.subjects}>{(subject) => <option value={subject.id}>{subject.name}</option>}</For>
          </Select>
          <Show when={subjectUnavailable()}>
            <p class="mt-1 text-[11px] text-destructive">{t("questions.subjectUnavailableHelp")}</p>
          </Show>
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
            <Button type="button" variant="outline" size="sm" class="h-7 gap-1 text-xs" disabled={rows().length >= BANK_QUESTION_LIMITS.maxChoices} onClick={addChoice}>
              <IconPlus class="h-3.5 w-3.5" />
              {t("questions.addChoice")}
            </Button>
          </div>
          <div class="space-y-2">
            <Index each={rows()}>
              {(row, index) => {
                const isCorrect = () => choiceSet().correct === row().id;
                // Keyed by the row's own id, so a stored option keeps its picture no
                // matter where it sits now; null = a row the server has never seen.
                const stored = () => storedImage(row().id);
                return (
                  <div
                    data-choice-id={row().id}
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
                      onClick={() => setCorrect(row().id)}
                      title={t("questions.correct")}
                    >
                      {isCorrect() ? <IconCheck class="h-3.5 w-3.5" /> : String.fromCharCode(65 + index)}
                    </button>
                    <div class="min-w-0 flex-1 space-y-1.5">
                      <Input
                        class="h-8 text-sm"
                        value={row().text}
                        maxlength={500}
                        placeholder={t("questions.choicePlaceholder", { index: String.fromCharCode(65 + index) })}
                        onInput={(e) => setChoice(row().id, e.currentTarget.value)}
                      />
                      <div class="flex items-center gap-2">
                        <input
                          id={`choice-image-${index}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          class="sr-only"
                          onChange={(event) => setChoiceImage(row().id, event.currentTarget.files?.[0] ?? null)}
                        />
                        <label for={`choice-image-${index}`} class="flex cursor-pointer items-center gap-1 rounded-md border border-dashed bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                          <IconFileImage class="h-3 w-3" />
                          {row().image?.name ?? t("questions.choiceImage")}
                        </label>
                        <Show when={stored() && props.choiceImageSrc}>
                          <img
                            src={props.choiceImageSrc?.(row().id)}
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
                      disabled={rows().length <= BANK_QUESTION_LIMITS.minChoices}
                      class="mt-0.5 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeChoice(row().id)}
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
