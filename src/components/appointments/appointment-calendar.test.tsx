import { cleanup, render, screen } from "@solidjs/testing-library";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { PreferencesProvider } from "@/stores/preferences-context";

afterEach(cleanup);

test("shows active appointments in the selected day below the calendar", () => {
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  render(() => (
    <PreferencesProvider>
      <AppointmentCalendar
        userId="student-1"
        appointments={[{
          id: "appointment-1",
          slot: "slot-1",
          teacher: { id: "teacher-1", username: "teacher", display_name: "Teacher Name" },
          requester: { id: "student-1", username: "student", display_name: "Student Name" },
          status: "pending",
          reason: "Planning",
          starts_at: start.getTime(),
          ends_at: start.getTime() + 30 * 60_000,
          proposed_starts_at: null,
          proposed_ends_at: null,
          proposed_by: null,
          decided_by: null,
          cancelled_by: null,
          cancel_reason: null,
          reject_reason: null,
          created_at: start.getTime(),
        }]}
      />
    </PreferencesProvider>
  ));

  expect(screen.getByRole("heading", { name: "Appointment calendar" })).toBeTruthy();
  expect(screen.getByText("Teacher Name")).toBeTruthy();
  expect(screen.getByText("Pending")).toBeTruthy();
});
