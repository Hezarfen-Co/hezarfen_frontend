import { fireEvent, render, screen } from "@solidjs/testing-library";
import { ExamRoomWS } from "@/components/exams/exam-room-ws";
import { PreferencesProvider } from "@/stores/preferences-context";

const HOUR = 60 * 60 * 1000;

const exam = {
  id: "e-1",
  creator: "u-9",
  course: "c-1",
  title: "Midterm",
  description: "",
  kind: "exam",
  mode: "open",
  starts_at: null,
  ends_at: null,
  duration_ms: HOUR,
  max_attempts: 3,
  allow_rejoin: true,
  allow_review: false,
  draft: false,
};

// The snapshot `start()`/`resume()` read over REST: the backend clears `left_at`
// inside the room task, milliseconds AFTER the socket upgrade, so a second visit
// legitimately reads back a sitting that still carries a stamp.
const staleAttempt = () => ({
  id: "a-1",
  exam: "e-1",
  user: { id: "u-1", name: "Ada", surname: "L" },
  status: "in_progress",
  attempt: 1,
  attempts_used: 1,
  max_attempts: 3,
  started_at: Date.now() - HOUR,
  finished_at: null,
  deadline: Date.now() + HOUR,
  remaining_ms: HOUR,
  left_at: Date.now() - 1000,
  mark: null,
  answered: 0,
  question_count: 1,
  now: Date.now(),
});

const question = {
  id: "q-1",
  exam: "e-1",
  subject: "s-1",
  text: "Capital of France?",
  kind: "choice",
  points: 2,
  choices: [
    { id: "ch-1", text: "Paris" },
    { id: "ch-2", text: "Rome" },
  ],
  answer: null,
};

let attemptRow = staleAttempt();

vi.mock("@/api/exams", () => ({
  postExamAttempt: async () => attemptRow,
  getExamAttempt: async () => attemptRow,
  getExamAttemptQuestions: async () => [question],
  postExamAttemptAnswer: async () => ({}),
  postExamAttemptFinish: async () => ({}),
  postExamAttemptAnswerImage: async () => ({}),
  deleteExamAttemptAnswerImage: async () => ({}),
  getExamAnswerImageBlob: async () => new Blob(),
}));
vi.mock("@/api/settings", () => ({ getSettings: async () => ({ max_file_bytes: 1024 * 1024 }) }));
vi.mock("@/api/time", () => ({ getTime: async () => ({ now: Date.now() }) }));

/** Controllable stand-in for the socket the room owns; drives frames by hand. */
class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
  deliver(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  frames() {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

// Fake timers go in only once the room is already up (see the ack-timeout
// tests), so the same helper has to work on both clocks.
const tick = () => (vi.isFakeTimers() ? vi.advanceTimersByTimeAsync(0) : new Promise((resolve) => setTimeout(resolve, 0)));
const socket = () => FakeWebSocket.instances.at(-1)!;
const sockets = () => FakeWebSocket.instances.length;
const closedBanners = () => screen.queryAllByText("This attempt is closed. Answers are read-only.");
const choice = (name: string) => screen.getByRole("button", { name: new RegExp(name) }) as HTMLButtonElement;
const badge = (text: string) => screen.queryAllByText(text).length > 0;

/** Mount, press Start, land inside the room with the stale snapshot loaded. */
async function openRoom() {
  const mounted = render(() => (
    <PreferencesProvider>
      <ExamRoomWS exam={exam as never} />
    </PreferencesProvider>
  ));
  fireEvent.click(await screen.findByRole("button", { name: "Start exam" }));
  await tick();
  await tick();
  return mounted;
}

const liveState = {
  type: "state",
  status: "in_progress",
  deadline: Date.now() + HOUR,
  remaining_ms: HOUR,
  now: Date.now(),
  answered: 0,
  question_count: 1,
};

/** Room open, socket in, one `state` frame delivered — the writable baseline. */
async function openWritableRoom() {
  const mounted = await openRoom();
  socket().open();
  socket().deliver(liveState);
  await tick();
  return mounted;
}

beforeEach(() => {
  attemptRow = staleAttempt();
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// BUG 1 — the rejoin lockout.
test("a state frame clears the stale left_at stamp and unlocks the sheet", async () => {
  await openRoom();

  // The REST snapshot still carries `left_at`, so the room opens read-only.
  expect(closedBanners().length).toBe(1);
  expect(choice("Paris").disabled).toBe(true);

  socket().open();
  socket().deliver(liveState);
  await tick();

  // A `state` frame is proof the socket is in, which is what clears `left_at`.
  expect(closedBanners()).toEqual([]);
  expect(choice("Paris").disabled).toBe(false);
  fireEvent.click(choice("Paris"));
  expect((screen.getByRole("button", { name: "Save answer" }) as HTMLButtonElement).disabled).toBe(false);
});

test("without a state frame the stale stamp is still respected", async () => {
  await openRoom();
  socket().open(); // socket up, but the server has said nothing yet
  await tick();

  expect(closedBanners().length).toBe(1);
  expect(choice("Paris").disabled).toBe(true);
});

test("a genuinely closed sitting stays read-only even after a state frame", async () => {
  await openRoom();
  socket().open();
  socket().deliver({ ...liveState, status: "submitted" });
  await tick();

  // `left_at: null` must not be read as "writable" — the status still rules.
  expect(closedBanners().length).toBeGreaterThan(0);
  expect(choice("Paris").disabled).toBe(true);
});

// BUG 2 — question_id is not an identity; only the echoed client_seq is.
// Pick a choice, press save, hand back the frame that went out. The button
// relabels to "Save answer again" after a failure, hence the prefix match.
async function save(name: string) {
  fireEvent.click(choice(name));
  fireEvent.click(screen.getByRole("button", { name: /^Save answer/ }));
  await tick();
  const answer = socket().frames().filter((f) => f.type === "answer").at(-1);
  return answer as { question_id: string; client_seq: number };
}
const saveParis = () => save("Paris");

test("an answer frame carries a client_seq and its echo settles that send", async () => {
  await openWritableRoom();
  const answer = await saveParis();

  expect(answer.question_id).toBe("q-1");
  expect(typeof answer.client_seq).toBe("number");
  expect(badge("Saving…")).toBe(true);

  socket().deliver({ type: "saved", question_id: "q-1", updated_at: Date.now(), client_seq: answer.client_seq });
  await tick();
  expect(badge("Saved")).toBe(true);
});

test("a saved frame echoing a different client_seq does not settle a live send", async () => {
  await openWritableRoom();
  const answer = await saveParis();

  // Same question, stale/foreign seq: this is exactly the frame that used to
  // paint "Saved" for an answer the server never took.
  socket().deliver({ type: "saved", question_id: "q-1", updated_at: Date.now(), client_seq: answer.client_seq + 7 });
  await tick();
  expect(badge("Saved")).toBe(false);
  expect(badge("Saving…")).toBe(true);

  socket().deliver({ type: "saved", question_id: "q-1", updated_at: Date.now(), client_seq: answer.client_seq });
  await tick();
  expect(badge("Saved")).toBe(true);
});

test("a reply with no client_seq confirms nothing and fails what is in flight", async () => {
  await openWritableRoom();
  await saveParis();

  // An older server: names the question but not the send — confirm nobody.
  socket().deliver({ type: "saved", question_id: "q-1", updated_at: Date.now() });
  await tick();
  expect(badge("Saved")).toBe(false);
  expect(badge("Saving…")).toBe(true);

  // Same for an unattributable error: fail everything rather than guess.
  socket().deliver({ type: "error", message: "boom" });
  await tick();
  expect(badge("Not saved")).toBe(true);
  expect(badge("Saved")).toBe(false);
});

// The ack timeout. Fake timers are installed AFTER the room is open, so the
// mount's real-clock work (`createNow`'s getTime + 30s interval, the countdown
// interval) never has to be driven by hand — only the 8s ack timer, which is
// created later, inside `saveAnswer`, lands on the fake clock.
const ACK_MS = 8000;

test("a send that never gets a reply reads as not saved once it times out", async () => {
  await openWritableRoom();
  vi.useFakeTimers();
  await saveParis();

  expect(badge("Saving…")).toBe(true);
  await vi.advanceTimersByTimeAsync(ACK_MS + 1);

  expect(badge("Not saved")).toBe(true);
  expect(badge("Saved")).toBe(false);
  expect(screen.getByText(/did not confirm your answer/)).toBeTruthy();
});

test("a timed-out send leaves no debt that swallows the next save", async () => {
  await openWritableRoom();
  vi.useFakeTimers();
  const a = await save("Paris");
  await vi.advanceTimersByTimeAsync(ACK_MS + 1);
  expect(badge("Not saved")).toBe(true);

  const b = await save("Rome");
  expect(b.client_seq).not.toBe(a.client_seq);

  // A's echo turns up late. Under the old FIFO+debt matching this frame was
  // the one that got eaten, and B — genuinely stored — read as not saved.
  socket().deliver({ type: "saved", question_id: "q-1", updated_at: Date.now(), client_seq: a.client_seq });
  await tick();
  expect(badge("Saved")).toBe(false);
  expect(badge("Saving…")).toBe(true);

  socket().deliver({ type: "saved", question_id: "q-1", updated_at: Date.now(), client_seq: b.client_seq });
  await tick();
  expect(badge("Saved")).toBe(true);
  expect(badge("Not saved")).toBe(false);
});

// Reconnect. Same fake-timer discipline: the clock goes fake only once the room
// is up, so only the backoff timers are hand-driven.
const drop = () => socket().onclose?.();

test("a socket that drops mid-sitting reconnects and the room recovers", async () => {
  await openWritableRoom();
  vi.useFakeTimers();

  drop();
  await tick();
  expect(badge("Disconnected")).toBe(true);

  await vi.advanceTimersByTimeAsync(1000);
  expect(sockets()).toBe(2); // a fresh socket, not the dead one
  socket().open();
  socket().deliver({ ...liveState, remaining_ms: HOUR - 60_000 });
  await tick();

  // Recovered: live again, still writable, clock moving rather than frozen.
  expect(badge("Connected")).toBe(true);
  expect(closedBanners()).toEqual([]);
  expect(choice("Paris").disabled).toBe(false);
  expect(badge("00:59:00")).toBe(true);
});

test("backoff grows between failed opens and resets after one succeeds", async () => {
  await openWritableRoom();
  vi.useFakeTimers();

  drop();
  await vi.advanceTimersByTimeAsync(1000);
  expect(sockets()).toBe(2);

  // That one never opened: the next wait must be longer than the first.
  drop();
  await vi.advanceTimersByTimeAsync(1000);
  expect(sockets()).toBe(2);
  await vi.advanceTimersByTimeAsync(1000);
  expect(sockets()).toBe(3);

  // A successful open clears the debt, so a later blip retries fast again.
  socket().open();
  await tick();
  drop();
  await vi.advanceTimersByTimeAsync(1000);
  expect(sockets()).toBe(4);
});

test("a socket we closed ourselves never reconnects", async () => {
  const mounted = await openWritableRoom();
  vi.useFakeTimers();

  const ours = socket();
  mounted.unmount();
  ours.onclose?.(); // the close WE asked for must not look like a drop

  await vi.advanceTimersByTimeAsync(60_000);
  expect(sockets()).toBe(1);
});

test("a save in flight when the socket drops fails toward not saved", async () => {
  await openWritableRoom();
  await saveParis();
  expect(badge("Saving…")).toBe(true);

  drop();
  await tick();
  expect(badge("Not saved")).toBe(true);
  expect(badge("Saved")).toBe(false);
  expect(screen.getByText(/connection dropped before your answer was saved/)).toBeTruthy();
});

// Finish / expiry. A terminal frame is terminal: a later `state` frame carries
// `left_at: null`, and that must not read as "writable" on a sitting that is over.
test("a finished frame closes the sheet and a later state frame does not reopen it", async () => {
  await openWritableRoom();
  socket().deliver({ type: "finished", finished_at: Date.now() });
  await tick();

  expect(closedBanners().length).toBeGreaterThan(0);
  expect(choice("Paris").disabled).toBe(true);
  expect(badge("Submitted")).toBe(true);

  socket().deliver({ ...liveState, status: "submitted" });
  await tick();
  expect(closedBanners().length).toBeGreaterThan(0);
  expect(choice("Paris").disabled).toBe(true);
});

test("an expired frame zeroes the clock and a later state frame does not reopen it", async () => {
  await openWritableRoom();
  socket().deliver({ type: "expired" });
  await tick();

  expect(closedBanners().length).toBeGreaterThan(0);
  expect(choice("Paris").disabled).toBe(true);
  expect(badge("00:00:00")).toBe(true);

  socket().deliver({ ...liveState, status: "expired", remaining_ms: 0 });
  await tick();
  expect(closedBanners().length).toBeGreaterThan(0);
  expect(choice("Paris").disabled).toBe(true);
});
