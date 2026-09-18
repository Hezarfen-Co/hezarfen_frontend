import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { SessionRollCall } from "@/components/sessions/session-roll-call";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getSessionAttendance, postSessionAttendance } = vi.hoisted(() => ({
  getSessionAttendance: vi.fn(async () => ({ items: [], total: 0, limit: null, offset: 0 })),
  postSessionAttendance: vi.fn(async (_sessionId: string, body: { user_id: string; status: string }) => ({
    id: `attendance-${body.user_id}`,
    session: "session-1",
    class_course: "instance-1",
    user: { id: body.user_id, username: body.user_id, display_name: null },
    status: body.status,
    marked_by: { id: "manager-1", username: "manager", display_name: null },
  })),
}));

vi.mock("@/api/sessions", () => ({
  getSessionAttendance,
  postSessionAttendance,
  deleteSessionAttendanceByUserId: vi.fn(async () => undefined),
}));

vi.mock("@/api/settings", () => ({
  getSettings: async () => ({ attendance_statuses: ["present", "absent", "late", "excused"] }),
}));

const enrollment = (id: string, name: string) => ({
  id: `enrollment-${id}`,
  class_course: "instance-1",
  user: { id, username: id, display_name: name },
  enrolled_by: { id: "manager-1", username: "manager", display_name: null },
  source: null,
});
const roster = [enrollment("student-1", "Ada Öğrenci")];

const teacher = { id: "teacher-1", username: "teacher", display_name: "Deniz Öğretmen" };

afterEach(() => {
  vi.clearAllMocks();
});

const mount = (props: { roster?: ReturnType<typeof enrollment>[]; canMarkTeacher?: boolean } = {}) =>
  render(() => (
    <PreferencesProvider>
      <SessionRollCall
        sessionId="session-1"
        roster={props.roster ?? roster}
        teacher={teacher}
        canMarkTeacher={props.canMarkTeacher ?? false}
      />
    </PreferencesProvider>
  ));
const statusButtons = (name: string) => within(screen.getByRole("radiogroup", { name }));
/** The status buttons unlock once the saved marks have loaded. */
const ready = () => screen.findByText(/\d+ of \d+ marked|kişiden \d+ işaretlendi/);

test("lets manager-level users mark the session teacher alongside enrolled students", async () => {
  mount({ canMarkTeacher: true });

  expect(await screen.findByText("Ada Öğrenci")).toBeTruthy();
  await ready();
  fireEvent.click(statusButtons("Deniz Öğretmen").getByRole("radio", { name: /Present|Var|Mevcut/ }));

  await waitFor(() => {
    expect(postSessionAttendance).toHaveBeenCalledWith("session-1", { user_id: "teacher-1", status: "present" });
  });
});

test("keeps the teacher out of roll call for users without staff-attendance rights", async () => {
  mount();

  expect(await screen.findByText("Ada Öğrenci")).toBeTruthy();
  expect(screen.queryByText("Deniz Öğretmen")).toBeNull();
  expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
});

test("one tap saves that row, with no roster refetch", async () => {
  mount();
  await ready();
  const absent = statusButtons("Ada Öğrenci").getByRole("radio", { name: /Absent|Yok|Devamsız/ });

  fireEvent.click(absent);

  await waitFor(() => expect(postSessionAttendance).toHaveBeenCalledWith("session-1", { user_id: "student-1", status: "absent" }));
  expect(absent.getAttribute("aria-checked")).toBe("true");
  expect(getSessionAttendance).toHaveBeenCalledTimes(1);
});

test("mark the rest present fills only the unmarked students", async () => {
  getSessionAttendance.mockResolvedValueOnce({
    items: [{
      id: "a-2",
      session: "session-1",
      class_course: "instance-1",
      user: { id: "student-2", username: "student-2", display_name: "Bora" },
      status: "absent",
      marked_by: { id: "teacher-1", username: "teacher", display_name: null },
    }],
    total: 1,
    limit: null,
    offset: 0,
  } as never);
  mount({
    roster: [enrollment("student-1", "Ada"), enrollment("student-2", "Bora"), enrollment("student-3", "Cem")],
    canMarkTeacher: true,
  });
  expect(await screen.findByText(/1 of 4 marked|4 kişiden 1/)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Mark the rest present|Kalanları Var/ }));

  await waitFor(() => expect(postSessionAttendance).toHaveBeenCalledTimes(2));
  const marked = postSessionAttendance.mock.calls.map(([, body]) => body.user_id).sort();
  expect(marked).toEqual(["student-1", "student-3"]);
  expect(await screen.findByText(/3 of 4 marked|4 kişiden 3/)).toBeTruthy();
});

test("a failed save puts the row back as it was", async () => {
  postSessionAttendance.mockRejectedValueOnce(new Error("offline"));
  mount();
  await ready();
  const late = statusButtons("Ada Öğrenci").getByRole("radio", { name: /Late|Geç/ });

  fireEvent.click(late);

  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(late.getAttribute("aria-checked")).toBe("false");
});
