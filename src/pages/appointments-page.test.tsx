import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import AppointmentsPage from "@/pages/appointments-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getAppointments, getSlots } = vi.hoisted(() => ({
  getAppointments: vi.fn(),
  getSlots: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({ Navigate: () => null }));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "student-1", username: "student", role: "student" }),
    loading: () => false,
    error: () => undefined,
  }),
}));
vi.mock("@/lib/create-live-poll", () => ({ createLivePoll: vi.fn() }));
vi.mock("@/api/appointments", () => ({
  getAppointments,
  getSlots,
  deleteSlotById: vi.fn(),
  deleteSlotSeries: vi.fn(),
  patchAcceptReschedule: vi.fn(),
  patchApproveAppointment: vi.fn(),
  patchCancelAppointment: vi.fn(),
  patchDeclineReschedule: vi.fn(),
  patchRejectAppointment: vi.fn(),
  patchRescheduleAppointment: vi.fn(),
  postAppointment: vi.fn(),
  postSlots: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("separates bookings and available times into tabs", async () => {
  const emptyPage = { items: [], total: 0, limit: 100, offset: 0 };
  getAppointments.mockResolvedValue(emptyPage);
  getSlots.mockResolvedValue(emptyPage);

  render(() => <PreferencesProvider><AppointmentsPage /></PreferencesProvider>);

  expect(await screen.findByRole("heading", { name: "Appointment calendar" })).toBeTruthy();
  const availableTab = screen.getByRole("tab", { name: /Available times/ });
  fireEvent.click(availableTab);

  expect(availableTab.getAttribute("aria-selected")).toBe("true");
  expect(await screen.findByRole("heading", { name: "Available times" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Appointment calendar" })).toBeNull();
});
