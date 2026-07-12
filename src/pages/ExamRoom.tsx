// The room a student sits a scheduled exam in: a server-judged countdown,
// one card per question, and autosave on every change — over the exam
// WebSocket when it's up, plain REST when it isn't. The page never *starts*
// an attempt (entering is an explicit choice on the exam page, because an
// async timer starts ticking); it resumes, reviews, or bounces back.

import { A, useParams } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import { ConfirmButton } from "../components/ConfirmButton";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { createAction } from "../lib/action";
import { ApiError, exams } from "../lib/api";
import { createClock } from "../lib/clock";
import { formatCountdown, formatMillis } from "../lib/format";
import { t } from "../lib/i18n";
import type { AttemptQuestion, AttemptStatus } from "../lib/types";
import { LIMITS } from "../lib/types";

type SaveState = "saving" | "saved" | "error";

export default function ExamRoom() {
  const params = useParams<{ id: string }>();
  const clock = createClock();
  onCleanup(clock.stop);

  const [exam] = createResource(() => params.id, exams.get);
  const [attempt, { mutate: setAttempt }] = createResource(
    () => params.id,
    async (id) => {
      try {
        return await exams.myAttempt(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  );
  const [questions, { mutate: setQuestions }] = createResource(
    // Questions 404 until an attempt exists — gate on it.
    () => (attempt() ? params.id : undefined),
    exams.attemptQuestions,
  );

  // Live attempt state: seeded by the REST fetch, then driven by WS frames.
  const [status, setStatus] = createSignal<AttemptStatus | null>(null);
  const [deadline, setDeadline] = createSignal<number | null>(null);
  const [saveStates, setSaveStates] = createSignal<Record<string, SaveState>>({});
  const [roomError, setRoomError] = createSignal<string | null>(null);
  createEffect(() => {
    const current = attempt();
    if (current) {
      setStatus(current.status);
      setDeadline(current.deadline);
    }
  });

  /** `in_progress` by the server, but also judged against the ticking clock. */
  const effectiveStatus = () => {
    const current = status();
    const until = deadline();
    return current === "in_progress" && until !== null && clock.now() >= until
      ? "expired"
      : current;
  };
  const running = () => effectiveStatus() === "in_progress";
  const remaining = () => (deadline() === null ? null : deadline()! - clock.now());

  const answered = () =>
    (questions() ?? []).filter(
      (q) => q.answer !== null && (q.answer.selected !== null || (q.answer.text ?? "") !== ""),
    ).length;
  const total = () => questions()?.length ?? 0;

  // ---- autosave plumbing ----------------------------------------------------
  let socket: WebSocket | undefined;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const textTimers = new Map<string, ReturnType<typeof setTimeout>>();
  onCleanup(() => {
    disposed = true;
    clearTimeout(reconnect);
    for (const timer of textTimers.values()) clearTimeout(timer);
    socket?.close();
  });

  const markSave = (id: string, state: SaveState) =>
    setSaveStates((current) => ({ ...current, [id]: state }));

  const connect = () => {
    if (disposed || socket !== undefined) return;
    const ws = new WebSocket(exams.attemptSocketUrl(params.id));
    socket = ws;
    ws.onmessage = (event) => {
      const frame = JSON.parse(String(event.data)) as Record<string, unknown>;
      switch (frame.type) {
        case "state":
          setStatus(frame.status as AttemptStatus);
          setDeadline((frame.deadline as number | null) ?? null);
          break;
        case "saved":
          markSave(String(frame.question_id), "saved");
          setRoomError(null);
          break;
        case "finished":
          setStatus("submitted");
          break;
        case "expired":
          setStatus("expired");
          break;
        case "error":
          setRoomError(String(frame.message));
          break;
      }
    };
    ws.onclose = () => {
      if (socket === ws) socket = undefined;
      // While the exam still runs, quietly retry; REST keeps saves flowing.
      if (!disposed && running()) reconnect = setTimeout(connect, 3000);
    };
  };
  createEffect(() => {
    if (running()) connect();
  });

  /** Save one answer: WS when open (acked by a `saved` frame), REST otherwise. */
  const push = (questionId: string, payload: { selected?: number; text?: string }) => {
    markSave(questionId, "saving");
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "answer", question_id: questionId, ...payload }));
      return;
    }
    exams
      .saveAnswer(params.id, { question_id: questionId, ...payload })
      .then(() => {
        markSave(questionId, "saved");
        setRoomError(null);
      })
      .catch((err: unknown) => {
        markSave(questionId, "error");
        setRoomError(err instanceof Error ? err.message : t("savingFailed"));
      });
  };

  const patchAnswer = (questionId: string, patch: { selected?: number; text?: string }) =>
    setQuestions((current) =>
      current?.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answer: {
                selected: patch.selected ?? null,
                text: patch.text ?? null,
                updated_at: clock.now(),
              },
            }
          : q,
      ),
    );

  const pickChoice = (questionId: string, index: number) => {
    patchAnswer(questionId, { selected: index });
    push(questionId, { selected: index });
  };

  const typeText = (questionId: string, value: string) => {
    patchAnswer(questionId, { text: value });
    markSave(questionId, "saving");
    clearTimeout(textTimers.get(questionId));
    textTimers.set(
      questionId,
      setTimeout(() => push(questionId, { text: value }), 800),
    );
  };

  const finish = createAction(async () => {
    const finished = await exams.finishAttempt(params.id);
    setAttempt(finished);
  });

  return (
    <section class="page room">
      <Show when={!attempt.loading && exam()} fallback={<Loading />}>
        <Switch>
          <Match when={attempt() === null}>
            <Empty
              action={
                <A class="button-link" href={`/exams/${params.id}`}>
                  {t("backToExam")}
                </A>
              }
            >
              {t("notEnteredYet")}
            </Empty>
          </Match>
          <Match when={attempt()}>
            <>
              <header class="room-head card">
                <div class="room-title">
                  <h1>{exam()?.title}</h1>
                  <span class="meta">{t("answeredOf")(answered(), total())}</span>
                </div>
                <Show when={running()} fallback={<StatusChip status={effectiveStatus()} />}>
                  <div class="room-side">
                    <Show when={remaining() !== null}>
                      <span
                        class="countdown"
                        classList={{
                          warn: remaining()! < 5 * 60_000,
                          danger: remaining()! < 60_000,
                        }}
                      >
                        {formatCountdown(remaining()!)}
                      </span>
                    </Show>
                    <ConfirmButton
                      class="cta"
                      confirmText={
                        answered() < total()
                          ? t("turnInUnanswered")(total() - answered())
                          : t("turnInNow")
                      }
                      disabled={finish.pending()}
                      onConfirm={() => void finish.run()}
                    >
                      {t("turnIn")}
                    </ConfirmButton>
                  </div>
                </Show>
              </header>

              <Show when={effectiveStatus() === "submitted"}>
                <div class="card notice-ok">
                  {t("turnedInBanner")(formatMillis(attempt()!.finished_at))}
                </div>
              </Show>
              <Show when={effectiveStatus() === "expired"}>
                <div class="card notice-warn">{t("timeUpBanner")}</div>
              </Show>
              <ErrorLine error={roomError() ?? finish.error()} />

              <Show when={!questions.loading} fallback={<Loading />}>
                <Show
                  when={total()}
                  fallback={<Empty>{t("noQuestionsRoom")}</Empty>}
                >
                  <div class="stack">
                    <For each={questions()}>
                      {(question, index) => (
                        <QuestionCard
                          question={question}
                          number={index() + 1}
                          disabled={!running()}
                          saveState={saveStates()[question.id]}
                          onPick={(choice) => pickChoice(question.id, choice)}
                          onType={(value) => typeText(question.id, value)}
                        />
                      )}
                    </For>
                  </div>
                  <Show when={running()}>
                    <span class="row-actions room-foot">
                      <ConfirmButton
                        class="cta"
                        confirmText={
                          answered() < total()
                            ? t("turnInUnanswered")(total() - answered())
                            : t("turnInNow")
                        }
                        disabled={finish.pending()}
                        onConfirm={() => void finish.run()}
                      >
                        {t("turnIn")}
                      </ConfirmButton>
                    </span>
                  </Show>
                </Show>
              </Show>

              <p class="meta">
                <A href={`/exams/${params.id}`}>← {t("backToExam")}</A>
              </p>
            </>
          </Match>
        </Switch>
      </Show>
    </section>
  );
}

function StatusChip(props: { status: AttemptStatus | null }) {
  return (
    <Switch>
      <Match when={props.status === "submitted"}>
        <span class="badge phase-closed">{t("turnedInChip")}</span>
      </Match>
      <Match when={props.status === "expired"}>
        <span class="badge phase-closed">{t("timeUpChip")}</span>
      </Match>
    </Switch>
  );
}

function QuestionCard(props: {
  question: AttemptQuestion;
  number: number;
  disabled: boolean;
  saveState: SaveState | undefined;
  onPick: (choice: number) => void;
  onType: (value: string) => void;
}) {
  return (
    <div class="card stack question">
      <header class="row">
        <strong>Q{props.number}</strong>
        <span class="badge">{t("pts")(props.question.points)}</span>
        <span class="push save-state" classList={{ error: props.saveState === "error" }}>
          <Switch>
            <Match when={props.saveState === "saving"}>{t("savingState")}</Match>
            <Match when={props.saveState === "saved"}>{t("savedState")}</Match>
            <Match when={props.saveState === "error"}>{t("notSavedState")}</Match>
          </Switch>
        </span>
      </header>
      <p class="prewrap qtext">{props.question.text}</p>
      <Show
        when={props.question.kind === "choice"}
        fallback={
          <textarea
            rows={4}
            maxLength={LIMITS.answerText}
            placeholder={t("writeAnswerHere")}
            disabled={props.disabled}
            onInput={(e) => props.onType(e.currentTarget.value)}
          >
            {props.question.answer?.text ?? ""}
          </textarea>
        }
      >
        <div class="stack choice-pick">
          <For each={props.question.choices}>
            {(choice, index) => (
              <label
                class="choice-row"
                classList={{ picked: props.question.answer?.selected === index() }}
              >
                <input
                  type="radio"
                  name={`q-${props.question.id}`}
                  checked={props.question.answer?.selected === index()}
                  disabled={props.disabled}
                  onChange={() => props.onPick(index())}
                />
                <span>{choice}</span>
              </label>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
