import { For, Show, Suspense, createResource, createSignal, lazy } from "solid-js";
import { ApiError } from "@/api/client";
import { getExamQuestions } from "@/api/exams";
import { getStudentAnswers, getStudentAnswerImage } from "@/api/exams";
import type { StudentAnswerSheet } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconX } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { cn } from "@/lib/cn";
import { joinAnswerSheet } from "@/lib/answer-sheet";
import { pngBytesToScene } from "@/lib/drawing-file";
import type { DrawScene } from "@/lib/draw-stroke";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const DrawingPlayback = lazy(() => import("@/components/exams/drawing-playback").then((m) => ({ default: m.DrawingPlayback })));

/**
 * A student's answer image with optional stroke-by-stroke playback. Defaults to the
 * static <img>; "Play drawing" fetches the PNG, recovers its embedded scene, and swaps
 * in the replay. A plain image (no embedded strokes) falls back to the img and drops
 * the button — nothing to replay.
 */
function AnswerDrawing(props: { examId: string; userId: string; questionId: string }) {
  const t = useT();
  const imgSrc = `/api/exams/${props.examId}/attempts/${props.userId}/answers/${props.questionId}/image`;
  const [scene, setScene] = createSignal<DrawScene | null>(null);
  const [mode, setMode] = createSignal<"image" | "loading" | "playback" | "plain">("image");

  const enterPlayback = async () => {
    if (scene()) {
      setMode("playback");
      return;
    }
    setMode("loading");
    try {
      const blob = await getStudentAnswerImage(props.examId, props.userId, props.questionId);
      const parsed = pngBytesToScene(new Uint8Array(await blob.arrayBuffer()));
      if (parsed && parsed.strokes.length > 0) {
        setScene(parsed);
        setMode("playback");
      } else {
        setMode("plain"); // plain image or no strokes → keep the img, hide Play
      }
    } catch {
      setMode("image"); // fetch failed → keep the img, allow a retry
    }
  };

  return (
    <div class="mt-3 space-y-2">
      {/* local boundary: the lazy playback chunk must not suspend the whole answer sheet */}
      <Suspense fallback={<div class="h-64 w-full max-w-2xl rounded-md border bg-background" />}>
        <Show
          when={mode() === "playback" && scene()}
          fallback={<img src={imgSrc} alt={t("exams.drawAnswer")} class="h-64 w-full max-w-2xl rounded-md border bg-background object-contain" />}
        >
          {(s) => <DrawingPlayback scene={s()} />}
        </Show>
      </Suspense>
      <Show when={mode() !== "plain"}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mode() === "loading"}
          onClick={() => (mode() === "playback" ? setMode("image") : void enterPlayback())}
        >
          {mode() === "playback" ? t("exams.showImage") : t("exams.playDrawing")}
        </Button>
      </Show>
    </div>
  );
}

export function AnswerSheetView(props: { examId: string; userId: string }) {
  const t = useT();
  const [data] = createResource(
    () => [props.examId, props.userId] as const,
    async ([examId, userId]) => {
      const questions = await getExamQuestions(examId);
      let sheet: StudentAnswerSheet;
      try {
        sheet = await getStudentAnswers(examId, userId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          sheet = {
            exam: examId,
            user: { id: userId, username: userId, display_name: null },
            answers: [],
            auto_score: { earned: 0, possible: 0 },
          };
        } else {
          throw err;
        }
      }
      return { sheet, rows: joinAnswerSheet(questions.items, sheet.answers) };
    },
  );

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show when={data()}>
        {(d) => (
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-4 py-3">
              <p class="text-sm font-medium">{personLabelWithId(d().sheet.user)}</p>
              <Show when={d().sheet.answers.length > 0} fallback={<Badge variant="outline">{t("exams.notStarted")}</Badge>}>
                <Badge variant="secondary">
                  {t("exams.autoScore")}: {d().sheet.auto_score.earned}/{d().sheet.auto_score.possible}
                </Badge>
              </Show>
            </div>

            <For each={d().rows}>
              {(row, idx) => (
                <div class="rounded-md border p-4">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <span class="text-xs font-semibold text-muted-foreground">#{idx() + 1}</span>
                    <Badge variant="outline">{row.question.points} {t("questions.points")}</Badge>
                    <Show when={row.answer?.is_correct != null}>
                      <Badge variant="outline" class={cn(
                        "size-[22px] p-0 flex items-center justify-center",
                        row.answer?.is_correct ? "border-success/50 bg-success/10 text-success" : "border-destructive/50 bg-destructive/10 text-destructive",
                      )}>
                        <Show when={row.answer?.is_correct} fallback={<IconX class="h-3 w-3" />}>
                          <IconCheck class="h-3 w-3" />
                        </Show>
                      </Badge>
                    </Show>
                    <Show when={row.answer?.is_correct == null && row.question.kind === "text"}>
                      <Badge variant="outline" class="text-[10px]">{t("questions.kind.text")}</Badge>
                    </Show>
                    <Show when={row.answer?.is_correct == null && row.question.kind !== "text"}>
                      <span class="text-xs text-muted-foreground">—</span>
                    </Show>
                  </div>
                  <p class="mb-3 whitespace-pre-wrap text-sm font-medium">{row.question.text}</p>

                  <Show
                    when={row.question.kind === "choice"}
                    fallback={
                      <div class="rounded-sm bg-muted/40 p-3">
                        <p class="text-xs text-muted-foreground">{t("exams.textAnswer")}</p>
                        <p class="mt-1 whitespace-pre-wrap text-sm">{row.answer?.text || "—"}</p>
                        <Show when={row.answer?.answer_image}>
                          <AnswerDrawing examId={d().sheet.exam} userId={d().sheet.user.id} questionId={row.question.id} />
                        </Show>
                      </div>
                    }
                  >
                    <div class="space-y-1.5">
                      <For each={row.question.choices}>
                        {(choice, ci) => (
                          <div
                            class={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm ${
                              ci() === row.question.correct && ci() === row.answer?.selected
                                ? "border-success bg-success/10"
                                : ci() === row.question.correct
                                  ? "border-success/50 bg-success/5"
                                  : ci() === row.answer?.selected
                                    ? "border-destructive bg-destructive/10"
                                    : "border-border"
                            }`}
                          >
                            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background text-[11px] font-semibold text-foreground">
                              {String.fromCharCode(65 + ci())}
                            </span>
                            <span>{choice}</span>
                            <Show when={ci() === row.answer?.selected && ci() !== row.question.correct}>
                              <Badge variant="destructive" class="ml-auto text-[10px]">✗</Badge>
                            </Show>
                            {ci() === row.question.correct && (
                              <Badge variant="outline" class="ml-auto border-success/50 bg-success/10 text-success text-[10px]">
                                <IconCheck class="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
