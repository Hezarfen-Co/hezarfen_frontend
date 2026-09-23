import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { EventRollCall } from "@/components/events/event-roll-call";
import { PreferencesProvider } from "@/stores/preferences-context";

const { postEventAttendance } = vi.hoisted(() => ({
  postEventAttendance: vi.fn(async (_eventId: string, body: { user_id: string; status: string }) => {
    if (body.user_id === "s-3") throw new Error("outside audience");
    return { id: `a-${body.user_id}`, event: "event-1", user: { id: body.user_id, username: body.user_id, display_name: null }, status: body.status, marked_by: { id: "t", username: "t", display_name: null } };
  }),
}));

vi.mock("@/api/events", () => ({ postEventAttendance }));
vi.mock("@/api/settings", () => ({
  getSettings: async () => ({ attendance_statuses: ["present", "absent", "late", "excused"] }),
}));

const person = (id: string, name: string) => ({ id, username: id, display_name: name });
const roster = [
  { user: person("s-1", "Ada"), status: "present", marked_by: person("t", "Öğretmen") },
  { user: person("s-2", "Bora"), status: null, marked_by: null },
  { user: person("s-3", "Cem"), status: null, marked_by: null },
];

afterEach(() => {
  vi.clearAllMocks();
});

const mount = (open = true, onSaved = vi.fn()) =>
  render(() => (
    <PreferencesProvider>
      <EventRollCall eventId="event-1" roster={roster} open={open} onSaved={onSaved} />
    </PreferencesProvider>
  ));
const row = (name: string) => within(screen.getByRole("radiogroup", { name }));
const saveButton = () => screen.getByRole("button", { name: /Yoklamayı kaydet|Save roll call|Save attendance/ });

test("lists the whole audience with recorded statuses and nothing sent on pick", async () => {
  mount();
  expect(await screen.findByText("Ada")).toBeTruthy();
  expect(row("Ada").getByRole("radio", { name: /Katıldı|Attended/ }).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(row("Bora").getByRole("radio", { name: /Katılmadı|Did not attend/ }));
  expect(postEventAttendance).not.toHaveBeenCalled();
});

test("saves only changed rows and reports a failed row on that row", async () => {
  const onSaved = vi.fn();
  mount(true, onSaved);
  await screen.findByText("Ada");
  fireEvent.click(row("Ada").getByRole("radio", { name: /Katıldı|Attended/ })); // unchanged: no-op
  fireEvent.click(row("Bora").getByRole("radio", { name: /Katılmadı|Did not attend/ }));
  fireEvent.click(row("Cem").getByRole("radio", { name: /Geç geldi|Arrived late/ }));
  fireEvent.click(saveButton());

  await waitFor(() => expect(postEventAttendance).toHaveBeenCalledTimes(2));
  expect(postEventAttendance).toHaveBeenNthCalledWith(1, "event-1", { user_id: "s-2", status: "absent" });
  expect(postEventAttendance).toHaveBeenNthCalledWith(2, "event-1", { user_id: "s-3", status: "late" });
  // The failed row keeps its pick and carries its own error line.
  expect(await screen.findByText(/İşlem tamamlanamadı|could not be completed/)).toBeTruthy();
  expect(screen.getByText(/1 of 2 rows|2 satırdan 1/)).toBeTruthy();
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test("before the event starts nothing can be picked or saved", async () => {
  mount(false);
  await screen.findByText("Ada");
  expect((row("Bora").getByRole("radio", { name: /Katıldı|Attended/ }) as HTMLButtonElement).disabled).toBe(true);
  expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
});
