import { For, Show, Suspense, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { getExamAttempt } from "@/api/getExamAttempt";
import { getExamAttemptQuestions } from "@/api/getExamAttemptQuestions";
import { postExamAttempt } from "@/api/postExamAttempt";
import { postExamAttemptAnswer } from "@/api/postExamAttemptAnswer";
import { postExamAttemptFinish } from "@/api/postExamAttemptFinish";
import { formatApiError, formatApiErrorMessage } from "@/api/client";
import type { AttemptQuestion, Exam, ExamAttempt } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

type WsState = "connecting" | "connected" | "disconnected";
type WsMessage =
  | { type: "state"; status: string; deadline: number | null; remaining_ms: number | null; now: number; answered: number; question_count: number }
  | { type: "saved"; question_id: string; updated_at: number }
  | { type: "finished"; finished_at: number }
  | { type: "expired" }
  | { type: "pong" }
  | { type: "error"; message: string };

function formatRemaining(ms: number | null): string {
  if (ms == null) return "—";
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ExamRoomWS(props: { exam: Exam }) {
  const t = useT();
  const { locale } = usePreferences();
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [finishOpen, setFinishOpen] = createSignal(false);
  const [roomOpen, setRoomOpen] = createSignal(false);
  const [attempt, setAttempt] = createSignal<ExamAttempt | null>(null);
  const [questions, setQuestions] = createSignal<AttemptQuestion[]>([]);
  const [remainingMs, setRemainingMs] = createSignal<number | null>(0);
  const [wsState, setWsState] = createSignal<WsState>("disconnected");
  const scheduled = createMemo(() => props.exam.mode === "sync" || props.exam.mode === "async" || props.exam.mode === "open");
  const canWrite = createMemo(() => attempt()?.status === "in_progress" && (remainingMs() == null || remainingMs()! > 0));

  let ws: WebSocket | null = null;

  const wsUrl = () => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/exams/${encodeURIComponent(props.exam.id)}/attempt/ws`;
  };

  const connectWs = () => {
    if (ws) ws.close();
    setWsState("connecting");
    const socket = new WebSocket(wsUrl());
    ws = socket;

    socket.onopen = () => setWsState("connected");
    socket.onclose = () => {
      setWsState("disconnected");
      ws = null;
    };
    socket.onerror = () => {
      setWsState("disconnected");
      ws = null;
    };

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch {
        // ignore
      }
    };
  };

  const handleWsMessage = (msg: WsMessage) => {
    switch (msg.type) {
      case "state": {
        setAttempt((prev) =>
          prev
            ? { ...prev, status: msg.status as any, deadline: msg.deadline, remaining_ms: msg.remaining_ms, answered: msg.answered, question_count: msg.question_count, now: msg.now }
            : {
                id: undefined,
                exam: props.exam.id,
                status: msg.status as any,
                deadline: msg.deadline,
                remaining_ms: msg.remaining_ms,
                mark: null,
                answered: msg.answered,
                question_count: msg.question_count,
                now: msg.now,
              },
        );
        setRemainingMs(msg.remaining_ms);
        break;
      }
      case "saved": {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === msg.question_id
              ? { ...q, answer: { ...q.answer, updated_at: msg.updated_at } }
              : q,
          ),
        );
        break;
      }
      case "finished": {
        setAttempt((prev) => (prev ? { ...prev, status: "submitted" as any, remaining_ms: 0 } : prev));
        setRemainingMs(0);
        break;
      }
      case "expired": {
        setAttempt((prev) => (prev ? { ...prev, status: "expired" as any, remaining_ms: 0 } : prev));
        setRemainingMs(0);
        break;
      }
      case "pong": {
        break;
      }
      case "error": {
        setError(formatApiErrorMessage(msg.message, locale()));
        break;
      }
    }
  };

  const sendWs = (data: unknown) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  const start = async () => {
    setPending(true);
    setError("");
    try {
      const next = await postExamAttempt(props.exam.id);
      setAttempt(next);
      setRoomOpen(true);
      const qs = await getExamAttemptQuestions(props.exam.id);
      setQuestions(qs);
      connectWs();
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  const resume = async () => {
    setRoomOpen(true);
    try {
      const next = await getExamAttempt(props.exam.id);
      setAttempt(next);
      const qs = await getExamAttemptQuestions(props.exam.id);
      setQuestions(qs);
      connectWs();
    } catch (err) {
      setError(formatApiError(err, locale()));
    }
  };

  const saveAnswer = async (question: AttemptQuestion, value: string) => {
    setError("");
    if (ws && ws.readyState === WebSocket.OPEN) {
      const payload: Record<string, unknown> = { type: "answer", question_id: question.id };
      if (question.kind === "choice") {
        payload.selected = Number(value);
      } else {
        payload.text = value;
      }
      sendWs(payload);
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, answer: { ...q.answer, selected: question.kind === "choice" ? Number(value) : undefined, text: question.kind === "text" ? value : undefined } } : q)),
      );
    } else {
      setPending(true);
      try {
        if (question.kind === "choice") {
          await postExamAttemptAnswer(props.exam.id, { question_id: question.id, selected: Number(value) });
        } else {
          await postExamAttemptAnswer(props.exam.id, { question_id: question.id, text: value });
        }
        const next = await getExamAttempt(props.exam.id);
        setAttempt(next);
        const qs = await getExamAttemptQuestions(props.exam.id);
        setQuestions(qs);
      } catch (err) {
        setError(formatApiError(err, locale()));
      } finally {
        setPending(false);
      }
    }
  };

  const finish = async () => {
    setPending(true);
    setError("");
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWs({ type: "finish" });
      } else {
        await postExamAttemptFinish(props.exam.id);
        const next = await getExamAttempt(props.exam.id);
        setAttempt(next);
      }
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  onCleanup(() => {
    if (ws) ws.close();
  });

  createEffect(() => {
    const current = attempt();
    const remaining = current?.remaining_ms ?? null;
    if (!current || current.status !== "in_progress" || remaining == null || remaining <= 0) return;
    const startedAt = Date.now();
    const initial = remaining;
    const timer = window.setInterval(() => {
      setRemainingMs(Math.max(0, initial - (Date.now() - startedAt)));
    }, 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  return (
    <section class="surface-card space-y-5 p-5">
      <Show when={!roomOpen()}>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("attempt.title")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {props.exam.mode === "sync" ? t("exams.mode.sync") : props.exam.mode === "async" ? t("exams.mode.async") : props.exam.mode === "open" ? t("exams.mode.open") : t("attempt.unscheduled")}
            </p>
          </div>
          <Show when={scheduled()} fallback={<Badge variant="outline" class="w-fit rounded-full px-3 py-1">{t("attempt.unscheduled")}</Badge>}>
            <Show
              when={attempt()}
              fallback={
                <Button type="button" class="w-full sm:w-auto" disabled={pending()} onClick={() => void start()}>
                  {t("attempt.start")}
                </Button>
              }
            >
              <Button type="button" variant="outline" class="w-full sm:w-auto" disabled={pending()} onClick={() => void resume()}>
                {t("attempt.resume")}
              </Button>
            </Show>
          </Show>
        </div>
      </Show>

      {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show when={scheduled()}>
          <Show
            when={attempt()}
            fallback={
              <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                {t("attempt.notStarted")}
              </p>
            }
          >
            {(a) => <AttemptSummaryWS attempt={a()} remainingMs={remainingMs()} wsState={wsState()} />}
          </Show>
        </Show>

        <Show when={attempt() && roomOpen()}>
          <Show when={!canWrite()}>
            <p class="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{t("attempt.closed")}</p>
          </Show>
          <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_12rem] xl:grid-cols-[minmax(0,1fr)_13rem] 2xl:grid-cols-[minmax(0,1fr)_14rem]">
            <div class="grid auto-rows-fr items-stretch gap-4 2xl:grid-cols-2">
              <For each={questions()}>
                {(question, index) => (
                  <QuestionAnswerCardWS
                    index={index() + 1}
                    nextQuestionId={questions()[index() + 1]?.id}
                    question={question}
                    disabled={!canWrite() || pending()}
                    onSave={(value) => saveAnswer(question, value)}
                  />
                )}
              </For>
            </div>
            <aside class="surface-card order-first space-y-3 p-4 lg:sticky lg:top-4 lg:order-none">
              <div>
                <h3 class="font-display text-sm font-semibold">{t("questions.title")}</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  {attempt()?.answered ?? 0} / {attempt()?.question_count ?? questions().length} {t("attempt.progress").toLowerCase()}
                </p>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <For each={questions()}>
                  {(question, index) => (
                    <a
                      href={`#question-${question.id}`}
                      class={
                        question.answer
                          ? "inline-flex h-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-sm font-medium text-primary hover:bg-primary/15"
                          : "inline-flex h-9 items-center justify-center rounded-lg border bg-background text-sm font-medium hover:bg-accent"
                      }
                    >
                      {index() + 1}
                    </a>
                  )}
                </For>
              </div>
              <Show when={canWrite()}>
                <Button type="button" variant="destructive" class="h-10 w-full" disabled={pending()} onClick={() => setFinishOpen(true)}>
                  {t("attempt.finish")}
                </Button>
              </Show>
            </aside>
          </div>
        </Show>
      </Suspense>

      <ConfirmDialog
        open={finishOpen()}
        onOpenChange={setFinishOpen}
        title={t("attempt.finish")}
        summary={props.exam.title}
        onConfirm={finish}
      />
    </section>
  );
}

function AttemptSummaryWS(props: { attempt: ExamAttempt; remainingMs: number | null; wsState: WsState }) {
  const t = useT();
  const { locale } = usePreferences();
  const progressPct = () =>
    props.attempt.question_count <= 0
      ? 0
      : Math.round((props.attempt.answered / props.attempt.question_count) * 100);
  const remainingWarn = () => props.attempt.status === "in_progress" && props.remainingMs != null && props.remainingMs <= 5 * 60 * 1000;
  const statusLabel = () => {
    if (props.attempt.status === "in_progress") return t("attempt.inProgress");
    if (props.attempt.status === "submitted") return t("attempt.submitted");
    if (props.attempt.status === "expired") return t("attempt.expired");
    return props.attempt.status;
  };
  const wsLabel = () => {
    if (props.wsState === "connecting") return t("ws.connecting");
    if (props.wsState === "connected") return t("ws.connected");
    return t("ws.disconnected");
  };
  const attemptLabel = () => {
    if (props.attempt.attempts_used != null && props.attempt.max_attempts != null) return `${props.attempt.attempts_used} / ${props.attempt.max_attempts}`;
    if (props.attempt.attempt != null) return String(props.attempt.attempt);
    if (props.attempt.attempts_used != null) return String(props.attempt.attempts_used);
    return "—";
  };
  return (
    <div class="grid auto-rows-fr gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <div class="h-full rounded-lg border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.status")}</p>
        <p class="mt-1 font-medium">{statusLabel()}</p>
      </div>
      <div class="h-full rounded-lg border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.attempt")}</p>
        <p class="mt-1 font-medium tabular-nums">{attemptLabel()}</p>
      </div>
      <div class={remainingWarn() ? "h-full rounded-lg border border-amber-500/40 bg-amber-500/10 p-3" : "h-full rounded-lg border bg-background/60 p-3"}>
        <p class="text-xs text-muted-foreground">{t("attempt.remaining")}</p>
        <p class="mt-1 font-mono text-lg font-semibold tabular-nums">{formatRemaining(props.remainingMs)}</p>
      </div>
      <div class="h-full rounded-lg border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.progress")}</p>
        <p class="mt-1 font-medium">{props.attempt.answered} / {props.attempt.question_count}</p>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full bg-primary" style={{ width: `${progressPct()}%` }} />
        </div>
      </div>
      <div class="h-full rounded-lg border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.deadline")}</p>
        <p class="mt-1 font-medium">{formatDateTime(props.attempt.deadline, locale())}</p>
      </div>
      <div class="h-full rounded-lg border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.serverNow")}</p>
        <p class="mt-1 font-medium">{formatDateTime(props.attempt.now, locale())}</p>
      </div>
      <div class="h-full rounded-lg border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("ws.ping")}</p>
        <p class="mt-1 inline-flex items-center gap-2 font-medium">
          <span class={props.wsState === "connected" ? "h-2 w-2 rounded-full bg-success" : "h-2 w-2 rounded-full bg-warning"} />
          {wsLabel()}
        </p>
      </div>
      <Show when={props.attempt.mark != null}>
        <div class="h-full rounded-lg border bg-background/60 p-3">
          <p class="text-xs text-muted-foreground">{t("attempt.mark")}</p>
          <p class="mt-1 font-medium">{props.attempt.mark}</p>
        </div>
      </Show>
      <Show when={props.attempt.left_at != null}>
        <div class="h-full rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p class="text-xs text-muted-foreground">{t("attempt.left")}</p>
          <p class="mt-1 font-medium">{formatDateTime(props.attempt.left_at, locale())}</p>
        </div>
      </Show>
    </div>
  );
}

function QuestionAnswerCardWS(props: {
  index: number;
  nextQuestionId?: string;
  question: AttemptQuestion;
  disabled: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [value, setValue] = createSignal(
    props.question.kind === "choice"
      ? props.question.answer?.selected != null
        ? String(props.question.answer.selected)
        : ""
      : props.question.answer?.text ?? "",
  );
  const [saved, setSaved] = createSignal(false);

  createEffect(() => {
    setValue(
      props.question.kind === "choice"
        ? props.question.answer?.selected != null
          ? String(props.question.answer.selected)
          : ""
        : props.question.answer?.text ?? "",
    );
    setSaved(false);
  });

  const save = async () => {
    await props.onSave(value());
    setSaved(true);
    if (props.nextQuestionId) {
      document.getElementById(`question-${props.nextQuestionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <article id={`question-${props.question.id}`} class="surface-card min-h-[18rem] scroll-mt-24 p-5">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-muted-foreground">#{props.index}</span>
        <Badge variant="outline" class="rounded-full">{props.question.points} {t("questions.points")}</Badge>
        <Show when={saved()}>
          <Badge variant="outline" class="rounded-full">{t("attempt.saved")}</Badge>
        </Show>
        <Show when={props.question.answer?.updated_at}>
          {(updatedAt) => <Badge variant="outline" class="rounded-full">{t("attempt.savedAt")}: {formatDateTime(updatedAt(), locale())}</Badge>}
        </Show>
      </div>
      <p class="mb-4 whitespace-pre-wrap text-sm font-medium">{props.question.text}</p>
      <Show
        when={props.question.kind === "choice"}
        fallback={
           <Textarea
             class="min-h-32"
             value={value()}
            rows={4}
            disabled={props.disabled}
            maxlength={10000}
            onInput={(e) => {
              setSaved(false);
              setValue(e.currentTarget.value);
            }}
          />
        }
      >
        <div class="space-y-2">
          <For each={props.question.choices ?? []}>
            {(choice, choiceIndex) => (
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-lg border bg-background/60 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                disabled={props.disabled}
                onClick={() => {
                  setSaved(false);
                  setValue(String(choiceIndex()));
                }}
              >
                <span
                  class={
                    value() === String(choiceIndex())
                      ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-primary bg-primary"
                      : "h-4 w-4 shrink-0 rounded-[3px] border border-input bg-background"
                  }
                >
                  <span
                    class={value() === String(choiceIndex()) ? "h-2 w-2 rounded-[1px] bg-primary-foreground" : "hidden"}
                  />
                </span>
                <span>{choice}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
      <Button
        type="button"
        size="sm"
        class="mt-4 w-full sm:w-auto"
        disabled={props.disabled || (props.question.kind === "choice" && value() === "")}
        onClick={() => void save()}
      >
        {t("attempt.saveAnswer")}
      </Button>
    </article>
  );
}
