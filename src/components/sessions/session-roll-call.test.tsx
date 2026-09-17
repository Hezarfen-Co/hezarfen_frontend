import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
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

const roster = [{
  id: "enrollment-1",
  class_course: "instance-1",
  user: { id: "student-1", username: "ada", display_name: "Ada Öğrenci" },
  enrolled_by: { id: "manager-1", username: "manager", display_name: null },
  source: null,
}];

const teacher = { id: "teacher-1", username: "teacher", display_name: "Deniz Öğretmen" };

afterEach(() => {
  vi.clearAllMocks();
});

test("lets manager-level users mark the session teacher alongside enrolled students", async () => {
  render(() => (
    <PreferencesProvider>
      <SessionRollCall sessionId="session-1" roster={roster} teacher={teacher} canMarkTeacher />
    </PreferencesProvider>
  ));

  expect(await screen.findByText("Ada Öğrenci")).toBeTruthy();
  expect(screen.getByText("Deniz Öğretmen")).toBeTruthy();

  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  fireEvent.click(saveButtons[1]!);

  await waitFor(() => {
    expect(postSessionAttendance).toHaveBeenCalledWith("session-1", {
      user_id: "teacher-1",
      status: "present",
    });
  });
});

test("keeps the teacher out of roll call for users without staff-attendance rights", async () => {
  render(() => (
    <PreferencesProvider>
      <SessionRollCall sessionId="session-1" roster={roster} teacher={teacher} canMarkTeacher={false} />
    </PreferencesProvider>
  ));

  expect(await screen.findByText("Ada Öğrenci")).toBeTruthy();
  expect(screen.queryByText("Deniz Öğretmen")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);
});
