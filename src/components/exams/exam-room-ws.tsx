import { For, Match, Show, Suspense, Switch, createEffect, createMemo, createSignal, lazy, onCleanup } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getExamAttempt } from "@/api/exams";
import { getExamAttemptQuestions } from "@/api/exams";
import { getSettings } from "@/api/settings";
import { postExamAttempt } from "@/api/exams";
import { postExamAttemptAnswer } from "@/api/exams";
import { postExamAttemptFinish } from "@/api/exams";
import { postExamAttemptAnswerImage } from "@/api/exams";
import { deleteExamAttemptAnswerImage } from "@/api/exams";
import { getExamAnswerImageBlob } from "@/api/exams";
import { formatApiError, formatApiErrorMessage } from "@/api/client";
import type { AttemptQuestion, Exam, ExamAttempt } from "@/api/client";
import type { DrawScene } from "@/lib/draw-stroke";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { IconAlert, IconChevronLeft, IconChevronRight, IconEdit, IconTrash, IconUploadCloud } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { ACK_TIMEOUT, createAckWaiter } from "@/lib/create-ack-waiter";
import { createNow } from "@/lib/create-now";
import { triggerConfetti } from "@/lib/confetti";
import { formatDateTime } from "@/lib/format";
import { formatBytes, maxUploadBytes } from "@/lib/upload-limits";
import { parseExamWsMessage, type ExamWsMessage } from "@/lib/websocket-messages";
import { usePreferences, useT } from "@/stores/preferences-context";

// Lazy so the drawing pad rides its own chunk, off the exam room's initial load.
const DrawCanvas = lazy(() => import("@/components/ui/draw-canvas").then((m) => ({ default: m.DrawCanvas })));

type WsState = "connecting" | "connected" | "disconnected";
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
  const [activeQuestionIndex, setActiveQuestionIndex] = createSignal(0);
  const [remainingMs, setRemainingMs] = createSignal<number | null>(0);
  const [wsState, setWsState] = createSignal<WsState>("disconnected");
  const [settings] = createResource(async () => {
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });
  const now = createNow();
  const maxFileBytes = () => maxUploadBytes(settings());
  const scheduled = createMemo(() => props.exam.mode === "sync" || props.exam.mode === "async" || props.exam.mode === "open");
  const attemptStatus = createMemo(() => {
    const current = attempt();
    if (!current || current.status !== "in_progress") return current?.status;
    if (current.left_at != null) return "left";
    const deadline = current.deadline ?? props.exam.ends_at;
    return deadline != null && deadline <= now() ? "expired" : current.status;
  });
  const canUseNewAttempt = (current: ExamAttempt | null) =>
    !!current && current.status === "in_progress" && current.left_at != null && current.attempts_used < current.max_attempts;
  const canWrite = createMemo(() => attemptStatus() === "in_progress" && (remainingMs() == null || remainingMs()! > 0));
  const canStart = createMemo(() => {
    if (canUseNewAttempt(attempt())) return true;
    const status = attemptStatus();
    return status == null || status === "in_progress";
  });
  const canResume = createMemo(() => attempt() != null && attemptStatus() === "in_progress");
  const blockedStartLabel = () => {
    const status = attemptStatus();
    if (status === "submitted") return t("attempt.submitted");
    if (status === "expired") return t("attempt.expired");
    if (status === "left") return t("attempt.noAttemptsLeft");
    return t("attempt.unscheduled");
  };

  let ws: WebSocket | null = null;
  // A `send()` is not a save. Every WS answer waits for the server's matching
  // `saved` frame before the student is told anything was stored.
  const acks = createAckWaiter();
  // Stamped on every `answer` frame and echoed back on its reply. The server
  // treats it as opaque, so it only has to be unique while this room lives.
  let clientSeq = 0;
  // Auto-reconnect a socket that drops mid-sitting: a transient network blip
  // shouldn't freeze the live countdown/state at "disconnected". Rejoining also
  // clears the backend's `left_at` (which any socket close stamps) — so on an
  // `allow_rejoin` exam a blip recovers cleanly; on a locked exam the rejoin
  // 409s, which is the intended lockout. Backoff caps the churn; the counter
  // resets on a successful open.
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let closedByUs = false;
  const MAX_RECONNECT = 6;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const wsUrl = () => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/exams/${encodeURIComponent(props.exam.id)}/attempt/ws`;
  };

  // Retry only while the sitting is genuinely live and we didn't close on
  // purpose: a submitted/expired attempt (or a client-side expiry) is terminal,
  // and reconnecting there would only 409.
  const scheduleReconnect = () => {
    if (closedByUs || reconnectTimer) return;
    if (!roomOpen()) return;
    if (attempt()?.status !== "in_progress" || attemptStatus() !== "in_progress") return;
    if (reconnectAttempts >= MAX_RECONNECT) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectWs();
    }, delay);
  };

  const connectWs = () => {
    clearReconnect();
    // Detach the old socket's handlers before closing it: an intentional close
    // must not look like a drop and trigger a reconnect.
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
      acks.failAll(new Error(t("attempt.saveDisconnected")));
    }
    setWsState("connecting");
    const socket = new WebSocket(wsUrl());
    ws = socket;

    socket.onopen = () => {
      reconnectAttempts = 0;
      setWsState("connected");
    };
    const dropped = () => {
      setWsState("disconnected");
      ws = null;
      // Anything still waiting for a `saved` frame will never get one.
      acks.failAll(new Error(t("attempt.saveDisconnected")));
      scheduleReconnect();
    };
    socket.onclose = dropped;
    socket.onerror = dropped;

    socket.onmessage = (event) => {
      try {
        const msg = parseExamWsMessage(JSON.parse(event.data));
        if (msg) handleWsMessage(msg);
      } catch {
        // ignore
      }
    };
  };

  const handleWsMessage = (msg: ExamWsMessage) => {
    switch (msg.type) {
      case "state": {
        // `left_at` clears with the frame: the snapshot `start`/`resume` read
        // was taken before this socket joined, and joining is what clears the
        // stamp server-side. Keeping the stale value would leave a student who
        // merely reopened the room reading as "left" — every answer disabled
        // on a sitting the server would still take.
        // Terminal is terminal, the other direction of the same hazard: once
        // this sitting is submitted or expired, a frame claiming `in_progress`
        // must not reopen it — status and clock stay put, only the harmless
        // counters catch up.
        const over = attempt()?.status === "submitted" || attempt()?.status === "expired";
        setAttempt((prev) =>
          prev
            ? { ...prev, status: over ? prev.status : msg.status, left_at: null, deadline: msg.deadline, remaining_ms: over ? 0 : msg.remaining_ms, answered: msg.answered, question_count: msg.question_count, now: msg.now }
            : prev,
        );
        setRemainingMs(over ? 0 : msg.remaining_ms);
        break;
      }
      case "saved": {
        // No echo means we cannot tell which send this confirms (an older
        // server): confirm nobody and let the send time out as unsaved.
        if (msg.client_seq != null) acks.ack(msg.client_seq);
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
        setAttempt((prev) => (prev ? { ...prev, status: "submitted", remaining_ms: 0 } : prev));
        setRemainingMs(0);
        break;
      }
      case "expired": {
        setAttempt((prev) => (prev ? { ...prev, status: "expired", remaining_ms: 0 } : prev));
        setRemainingMs(0);
        break;
      }
      case "pong": {
        break;
      }
      case "error": {
        const message = formatApiErrorMessage(msg.message, locale());
        setError(message);
        // A frame that echoes our `client_seq` refused that one send; anything
        // else is room-level (bad frame, sitting over, unenrolled, internal
        // error) or from an older server, so everything in flight is treated as
        // rejected — never as saved.
        if (msg.client_seq != null) acks.fail(msg.client_seq, new Error(message));
        else acks.failAll(new Error(message));
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
      setActiveQuestionIndex(0);
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
      setActiveQuestionIndex(0);
      connectWs();
    } catch (err) {
      setError(formatApiError(err, locale()));
    }
  };

  // Resolves `true` only when the server confirmed the write, `false` when a
  // newer save for the same question took over, and throws when it failed —
  // the card's "saved" badge hangs off exactly this.
  const saveAnswer = async (question: AttemptQuestion, value: string): Promise<boolean> => {
    setError("");
    if (ws && ws.readyState === WebSocket.OPEN) {
      const seq = (clientSeq += 1);
      const payload: Record<string, unknown> = { type: "answer", question_id: question.id, client_seq: seq };
      if (question.kind === "choice") {
        payload.selected = value; // choice id, not a position
      } else {
        payload.text = value;
      }
      const acked = acks.wait(seq, question.id);
      sendWs(payload);
      let result;
      try {
        result = await acked;
      } catch (err) {
        // A drop or an error frame carries its own words; a timeout has none.
        const reason = (err as Error).message;
        setError(reason && reason !== ACK_TIMEOUT ? reason : t("attempt.saveTimeout"));
        throw err;
      }
      if (result === "superseded") return false;
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, answer: { ...q.answer, selected: question.kind === "choice" ? value : undefined, text: question.kind === "text" ? value : undefined } } : q)),
      );
      return true;
    }
    setPending(true);
    try {
      if (question.kind === "choice") {
        await postExamAttemptAnswer(props.exam.id, { question_id: question.id, selected: value });
      } else {
        await postExamAttemptAnswer(props.exam.id, { question_id: question.id, text: value });
      }
      // The POST above is the save. Refreshing is only about the badges, so a
      // failed refresh must not report a stored answer as lost.
      try {
        await refreshAnswers();
      } catch {
        // ignore — the countdown/updated_at catch up on the next poll
      }
      return true;
    } catch (err) {
      setError(formatApiError(err, locale()));
      throw err; // not stored — the card must not claim it is
    } finally {
      setPending(false);
    }
  };

  // A drawing is binary, so it skips the JSON WS/REST autosave: upload out-of-band,
  // then refetch so the answer's answer_image and updated_at badge catch up.
  const refreshAnswers = async () => {
    const next = await getExamAttempt(props.exam.id);
    setAttempt(next);
    const qs = await getExamAttemptQuestions(props.exam.id);
    setQuestions(qs);
  };

  const saveAnswerImage = async (question: AttemptQuestion, file: File) => {
    setError("");
    if (file.size > maxFileBytes()) {
      setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
      return;
    }
    setPending(true);
    try {
      await postExamAttemptAnswerImage(props.exam.id, question.id, file);
      await refreshAnswers();
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  const removeAnswerImage = async (question: AttemptQuestion) => {
    setError("");
    setPending(true);
    try {
      await deleteExamAttemptAnswerImage(props.exam.id, question.id);
      await refreshAnswers();
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
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
      triggerConfetti();
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  const currentQuestion = createMemo(() => {
    const list = questions();
    if (list.length === 0) return null;
    return list[Math.min(activeQuestionIndex(), list.length - 1)] ?? list[0];
  });

  const goPrevious = () => setActiveQuestionIndex((index) => Math.max(0, index - 1));
  const goNext = () => setActiveQuestionIndex((index) => Math.min(questions().length - 1, index + 1));

  onCleanup(() => {
    closedByUs = true;
    clearReconnect();
    if (ws) ws.close();
  });

  createEffect(() => {
    const current = attempt();
    const remaining = current?.remaining_ms ?? null;
    if (!current || current.status !== "in_progress" || remaining == null || remaining <= 0) return;
    const startedAt = Date.now();
    const initial = remaining;
    const timer = window.setInterval(() => {
      const next = Math.max(0, initial - (Date.now() - startedAt));
      setRemainingMs(next);
      if (next <= 0) {
        setAttempt((prev) => (prev && prev.status === "in_progress" ? { ...prev, status: "expired", remaining_ms: 0 } : prev));
        setFinishOpen(false);
        window.clearInterval(timer);
      }
    }, 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  return (
    <section class="data-shell space-y-5 p-5">
      <Show when={!roomOpen()}>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold">{t("attempt.title")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {props.exam.mode === "sync" ? t("exams.mode.sync") : props.exam.mode === "async" ? t("exams.mode.async") : props.exam.mode === "open" ? t("exams.mode.open") : t("attempt.unscheduled")}
            </p>
          </div>
          <Show when={scheduled() && canStart()} fallback={<Badge variant="outline" class="w-fit rounded-full px-3 py-1">{blockedStartLabel()}</Badge>}>
            <Show
              when={canResume()}
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

        <Show when={attempt()}>
          {(att) => (
            <Switch>
              <Match when={att().status === "submitted"}>
                <div class="rounded-lg border border-info/30 bg-info/10 px-4 py-3">
                  <div class="flex items-start gap-3">
                    <IconAlert class="mt-0.5 h-5 w-5 shrink-0 text-info-text" />
                    <div class="min-w-0 space-y-1">
                      <p class="text-sm font-semibold text-foreground">{t("attempt.submitted")}</p>
                      <p class="text-sm text-muted-foreground">{t("attempt.closed")}</p>
                    </div>
                  </div>
                </div>
              </Match>
              <Match when={att().status === "expired"}>
                <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <div class="flex items-start gap-3">
                    <IconAlert class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div class="min-w-0 space-y-1">
                      <p class="text-sm font-semibold text-foreground">{t("attempt.expired")}</p>
                      <p class="text-sm text-muted-foreground">{t("attempt.closed")}</p>
                    </div>
                  </div>
                </div>
              </Match>
              <Match when={attemptStatus() === "left"}>
                <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <div class="flex items-start gap-3">
                    <IconAlert class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div class="min-w-0 space-y-1">
                      <p class="text-sm font-semibold text-foreground">{t("attempt.left")}</p>
                      <p class="text-sm text-muted-foreground">{t("attempt.closed")}</p>
                    </div>
                  </div>
                </div>
              </Match>
            </Switch>
          )}
        </Show>
      </Show>

      <Show when={error()}>
        {(msg) => (
          <div class="overflow-hidden rounded-lg border border-destructive/30 bg-destructive/10">
            <div class="flex items-start gap-3 px-4 py-3">
              <IconAlert class="mt-0.5 h-5 w-5 shrink-0 text-destructive-text" />
              <p class="min-w-0 text-sm text-destructive-text">{msg()}</p>
            </div>
          </div>
        )}
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <Show when={scheduled()}>
          <Show
            when={attempt()}
            fallback={
              <Show when={!roomOpen()}>
                <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("attempt.notStarted")}
                </p>
              </Show>
            }
          >
            {(a) => (
              <Show when={!roomOpen() || a().status !== "in_progress"}>
                <AttemptSummaryWS attempt={a()} status={attemptStatus()} remainingMs={remainingMs()} wsState={wsState()} />
              </Show>
            )}
          </Show>
        </Show>

        <Show when={attempt() && roomOpen()}>
          <div class="min-h-[calc(100vh-9rem)] space-y-3">
            <AttemptFocusBar attempt={attempt()!} status={attemptStatus()} remainingMs={remainingMs()} wsState={wsState()} />
            <Show when={!canWrite()}>
              <p class="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{t("attempt.closed")}</p>
            </Show>
            <div class="grid min-h-[calc(100vh-13rem)] items-start gap-3 lg:grid-cols-[minmax(0,1fr)_11rem] xl:grid-cols-[minmax(0,1fr)_12rem]">
              <Show when={currentQuestion()}>
                {(question) => (
                  <div class="min-w-0 space-y-3">
                    <QuestionAnswerCardWS
                      index={activeQuestionIndex() + 1}
                      question={question()}
                      disabled={!canWrite() || pending()}
                      onSave={(value) => saveAnswer(question(), value)}
                      onSaved={goNext}
                      onSaveImage={(file) => saveAnswerImage(question(), file)}
                      onRemoveImage={() => removeAnswerImage(question())}
                    />
                    <div class="flex items-center justify-between gap-2">
                      <Button type="button" variant="outline" class="rounded-lg" disabled={activeQuestionIndex() === 0} onClick={goPrevious}>
                        <IconChevronLeft class="h-4 w-4" />
                        {t("common.prev")}
                      </Button>
                      <span class="text-xs text-muted-foreground">
                        {activeQuestionIndex() + 1} / {questions().length}
                      </span>
                      <Button type="button" variant="outline" class="rounded-lg" disabled={activeQuestionIndex() >= questions().length - 1} onClick={goNext}>
                        {t("common.next")}
                        <IconChevronRight class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Show>
              <aside class="data-shell order-first space-y-3 p-3 lg:sticky lg:top-4 lg:order-0">
              <div>
                <h3 class="text-sm font-semibold">{t("questions.title")}</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  {attempt()?.answered ?? 0} / {attempt()?.question_count ?? questions().length} {t("attempt.progress").toLowerCase()}
                </p>
              </div>
               <div class="grid grid-cols-4 gap-1.5">
                <For each={questions()}>
                  {(question, index) => (
                    <button
                      type="button"
                      class={cn(
                        "inline-flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors hover:bg-accent",
                        question.answer ? "border-primary/35 bg-primary/10 text-primary-text hover:bg-primary/15" : "bg-background",
                        activeQuestionIndex() === index() && "ring-2 ring-primary/60",
                      )}
                      onClick={() => setActiveQuestionIndex(index())}
                    >
                      {index() + 1}
                    </button>
                  )}
                </For>
              </div>
              <Show when={canWrite()}>
                <Button type="button" variant="destructive" class="h-9 w-full rounded-md" disabled={pending()} onClick={() => setFinishOpen(true)}>
                  {t("attempt.finish")}
                </Button>
              </Show>
              </aside>
            </div>
          </div>
        </Show>
      </Suspense>

      <ConfirmDialog
        open={finishOpen()}
        onOpenChange={setFinishOpen}
        variant="destructive"
        title={t("attempt.finish")}
        description={t("attempt.finishHint")}
        confirmLabel={t("attempt.finishConfirm")}
        summary={props.exam.title}
        onConfirm={finish}
      />
    </section>
  );
}

function AttemptSummaryWS(props: { attempt: ExamAttempt; status?: string; remainingMs: number | null; wsState: WsState; compact?: boolean }) {
  const t = useT();
  const { locale } = usePreferences();
  const progressPct = () =>
    props.attempt.question_count <= 0
      ? 0
      : Math.round((props.attempt.answered / props.attempt.question_count) * 100);
  const status = () => props.status ?? props.attempt.status;
  const remainingWarn = () => status() === "in_progress" && props.remainingMs != null && props.remainingMs <= 5 * 60 * 1000;
  const statusLabel = () => {
    if (status() === "in_progress") return t("attempt.inProgress");
    if (status() === "left") return t("attempt.left");
    if (status() === "submitted") return t("attempt.submitted");
    if (status() === "expired") return t("attempt.expired");
    return status() ?? "—";
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
    <div class={cn("grid auto-rows-fr gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6", props.compact && "2xl:grid-cols-7")}>
      <div class={cn("h-full rounded-lg border bg-background/60 p-3", props.compact && "hidden xl:block")}>
        <p class="text-xs text-muted-foreground">{t("attempt.status")}</p>
        <p class="mt-1 font-medium">{statusLabel()}</p>
      </div>
      <div class={cn("h-full rounded-lg border bg-background/60 p-3", props.compact && "hidden 2xl:block")}>
        <p class="text-xs text-muted-foreground">{t("attempt.attempt")}</p>
        <p class="mt-1 font-medium tabular-nums">{attemptLabel()}</p>
      </div>
      <div class={remainingWarn() ? "h-full rounded-lg border border-amber-500/40 bg-amber-500/10 p-3" : "h-full rounded-lg border bg-background/60 p-3"}>
        <p class="text-xs text-muted-foreground">{t("attempt.remaining")}</p>
        <p class="mt-1 font-mono text-lg font-semibold tabular-nums">{formatRemaining(props.remainingMs)}</p>
      </div>
      <div class={cn("h-full rounded-lg border bg-background/60 p-3", props.compact && "hidden 2xl:block")}>
        <p class="text-xs text-muted-foreground">{t("attempt.progress")}</p>
        <p class="mt-1 font-medium">{props.attempt.answered} / {props.attempt.question_count}</p>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full bg-primary" style={{ width: `${progressPct()}%` }} />
        </div>
      </div>
      <div class={cn("h-full rounded-lg border bg-background/60 p-3", props.compact && "hidden 2xl:block")}>
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

function AttemptFocusBar(props: { attempt: ExamAttempt; status?: string; remainingMs: number | null; wsState: WsState }) {
  const t = useT();
  const progressPct = () =>
    props.attempt.question_count <= 0
      ? 0
      : Math.round((props.attempt.answered / props.attempt.question_count) * 100);
  const wsLabel = () => {
    if (props.wsState === "connecting") return t("ws.connecting");
    if (props.wsState === "connected") return t("ws.connected");
    return t("ws.disconnected");
  };
  const statusLabel = () => props.status === "expired" ? t("attempt.expired") : props.status === "submitted" ? t("attempt.submitted") : t("attempt.inProgress");

  return (
    <div class="rounded-xl border bg-card px-3 py-2 shadow-xs">
      <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span class="font-medium text-foreground">{statusLabel()}</span>
        <span class="mono font-semibold tabular-nums text-foreground">{formatRemaining(props.remainingMs)}</span>
        <span>
          {props.attempt.answered} / {props.attempt.question_count} {t("attempt.progress").toLowerCase()}
        </span>
        <span class="ml-auto inline-flex items-center gap-1.5">
          <span class={props.wsState === "connected" ? "h-2 w-2 rounded-full bg-success" : "h-2 w-2 rounded-full bg-warning"} />
          {wsLabel()}
        </span>
      </div>
      <div class="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div class="h-full rounded-full bg-primary" style={{ width: `${progressPct()}%` }} />
      </div>
    </div>
  );
}

function QuestionAnswerCardWS(props: {
  index: number;
  question: AttemptQuestion;
  disabled: boolean;
  onSave: (value: string) => Promise<boolean>;
  onSaved?: () => void;
  onSaveImage: (file: File) => Promise<void>;
  onRemoveImage: () => Promise<void>;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [value, setValue] = createSignal(
    props.question.kind === "choice"
      ? props.question.answer?.selected ?? ""
      : props.question.answer?.text ?? "",
  );
  const [saveState, setSaveState] = createSignal<"idle" | "saving" | "saved" | "failed">("idle");
  const [drawOpen, setDrawOpen] = createSignal(false);
  const [editScene, setEditScene] = createSignal<DrawScene | null>(null);
  let imageInput: HTMLInputElement | undefined;
  let questionId = props.question.id;

  createEffect(() => {
    if (props.question.id === questionId) return;
    questionId = props.question.id;
    setValue(
      props.question.kind === "choice"
        ? props.question.answer?.selected ?? ""
        : props.question.answer?.text ?? "",
    );
    setSaveState("idle");
    setDrawOpen(false);
    setEditScene(null);
  });

  // "Saved" means the server said so. A failure leaves the typed/picked answer
  // untouched in the card so the student can just press save again.
  const save = async () => {
    // The card is reused across questions, and switching question resets
    // `saveState` — so an outcome that lands after the switch would paint a
    // badge for a question it never belonged to. Only the question that started
    // this save may be told about it.
    const savedId = props.question.id;
    setSaveState("saving");
    try {
      const confirmed = await props.onSave(value());
      if (!confirmed || props.question.id !== savedId) return; // a newer save owns the outcome
      setSaveState("saved");
      props.onSaved?.();
    } catch {
      if (props.question.id !== savedId) return;
      setSaveState("failed"); // the parent banner carries the reason
    }
  };

  const openNewDrawing = () => {
    setEditScene(null);
    setDrawOpen(true);
  };

  // Reload the stored PNG's embedded scene so the pad reopens on the saved drawing.
  const openEditDrawing = async () => {
    try {
      const blob = await getExamAnswerImageBlob(props.question.exam, props.question.id);
      const { pngBytesToScene } = await import("@/lib/drawing-file");
      setEditScene(pngBytesToScene(new Uint8Array(await blob.arrayBuffer())));
    } catch {
      setEditScene(null); // plain image or fetch failed → start blank, never crash
    } finally {
      setDrawOpen(true);
    }
  };

  const saveDrawing = async (file: File) => {
    await props.onSaveImage(file);
    setEditScene(null);
    setDrawOpen(false);
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    await props.onSaveImage(file);
    if (imageInput) imageInput.value = "";
  };

  return (
    <article id={`question-${props.question.id}`} class="data-shell min-h-[calc(100vh-16rem)] p-5 sm:p-6 lg:p-8">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-muted-foreground">#{props.index}</span>
        <Badge variant="outline" class="rounded-full">{props.question.points} {t("questions.points")}</Badge>
        <Show when={saveState() === "saving"}>
          <Badge variant="outline" class="rounded-full">{t("attempt.saving")}</Badge>
        </Show>
        <Show when={saveState() === "saved"}>
          <Badge variant="outline" class="rounded-full">{t("attempt.saved")}</Badge>
        </Show>
        <Show when={saveState() === "failed"}>
          <Badge variant="destructive" class="rounded-full">{t("attempt.notSaved")}</Badge>
        </Show>
        <Show when={props.question.answer?.updated_at}>
          {(updatedAt) => <Badge variant="outline" class="rounded-full">{t("attempt.savedAt")}: {formatDateTime(updatedAt(), locale())}</Badge>}
        </Show>
      </div>
      <Show when={props.question.image}>
        <img
          src={`/api/exams/${props.question.exam}/questions/${props.question.id}/image`}
          alt={t("questions.image")}
          class="mb-4 h-64 w-full max-w-2xl rounded-md border bg-muted/20 object-contain"
        />
      </Show>
      <p class="mb-5 whitespace-pre-wrap text-base font-semibold leading-7 sm:text-lg">{props.question.text}</p>
      <Show
        when={props.question.kind === "choice"}
        fallback={
          <div class="space-y-3">
            <Textarea
              class="min-h-32"
              value={value()}
              rows={4}
              disabled={props.disabled}
              maxlength={10000}
              onInput={(e) => {
                setSaveState("idle");
                setValue(e.currentTarget.value);
              }}
            />
            <Show when={props.question.answer?.answer_image}>
              <img
                src={`/api/exams/${props.question.exam}/attempt/answers/${props.question.id}/image`}
                alt={t("exams.drawAnswer")}
                class="h-64 w-full max-w-2xl rounded-md border bg-muted/20 object-contain"
              />
            </Show>
            <Show when={!props.disabled}>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  ref={(el) => { imageInput = el; }}
                  type="file"
                  accept="image/*"
                  class="hidden"
                  disabled={props.disabled}
                  onChange={(event) => void uploadImage(event.currentTarget.files?.[0])}
                />
                <Show
                  when={props.question.answer?.answer_image}
                  fallback={
                    <>
                      <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={openNewDrawing}>
                        <IconEdit class="h-4 w-4" />
                        {t("exams.drawAnswer")}
                      </Button>
                      <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => imageInput?.click()}>
                        <IconUploadCloud class="h-4 w-4" />
                        {t("exams.uploadAnswerImage")}
                      </Button>
                    </>
                  }
                >
                  <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => void openEditDrawing()}>
                    <IconEdit class="h-4 w-4" />
                    {t("exams.editDrawing")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => imageInput?.click()}>
                    <IconUploadCloud class="h-4 w-4" />
                    {t("exams.uploadAnswerImage")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" class="rounded-lg text-destructive-text hover:text-destructive-text" onClick={() => void props.onRemoveImage()}>
                    <IconTrash class="h-4 w-4" />
                    {t("exams.removeDrawing")}
                  </Button>
                </Show>
              </div>
            </Show>
          </div>
        }
      >
        <div class="space-y-2">
          <For each={props.question.choices ?? []}>
            {(choice, choiceIndex) => (
              <button
                type="button"
              class="flex w-full items-center gap-3 rounded-xl border bg-background/70 px-4 py-3 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                disabled={props.disabled}
                onClick={() => {
                  setSaveState("idle");
                  setValue(choice.id);
                }}
              >
                <span class={value() === choice.id ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-primary bg-clip-padding text-xs font-semibold text-primary-foreground" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-input bg-background text-xs font-semibold text-foreground"}>
                  {String.fromCharCode(65 + choiceIndex())}
                </span>
                <span class="min-w-0 space-y-2">
                  <span class="block whitespace-pre-wrap">{choice.text}</span>
                  <Show when={props.question.choice_images?.[choiceIndex()]}>
                    <img
                      src={`/api/exams/${props.question.exam}/questions/${props.question.id}/choices/${choice.id}/image`}
                      alt={t("questions.choiceImage")}
                      class="h-36 w-full max-w-md rounded-md border bg-muted/20 object-contain"
                    />
                  </Show>
                </span>
              </button>
            )}
          </For>
        </div>
      </Show>
      <Show when={saveState() === "failed"}>
        <p class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text">
          {t("attempt.notSavedHint")}
        </p>
      </Show>
      <Button
        type="button"
        size="sm"
        class="mt-4 w-full sm:w-auto"
        disabled={props.disabled || saveState() === "saving" || (props.question.kind === "choice" && value() === "")}
        onClick={() => void save()}
      >
        {saveState() === "failed" ? t("attempt.saveAnswerRetry") : t("attempt.saveAnswer")}
      </Button>
      <FormDialog
        open={drawOpen()}
        onOpenChange={(open) => {
          setDrawOpen(open);
          if (!open) setEditScene(null);
        }}
        title={t("exams.drawAnswer")}
        class="sm:max-w-3xl"
      >
        <Suspense fallback={<PageSpinner />}>
          <DrawCanvas
            pending={props.disabled}
            initialScene={editScene()}
            fileName="answer.png"
            onSave={(file) => void saveDrawing(file)}
          />
        </Suspense>
      </FormDialog>
    </article>
  );
}
