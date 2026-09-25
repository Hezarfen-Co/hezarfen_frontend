import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import SettingsPage from "@/pages/settings-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getSettings, patchSettings } = vi.hoisted(() => ({ getSettings: vi.fn(), patchSettings: vi.fn() }));

vi.mock("@tanstack/solid-router", () => ({
  useBlocker: () => () => ({ status: "idle" }),
  Navigate: () => null,
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "manager-1", role: "manager" }), loading: () => false, error: () => null }),
}));
vi.mock("@/api/settings", () => ({ getSettings, patchSettings }));
vi.mock("@/api/limits", () => ({
  getLimits: vi.fn(async () => ({ file: {}, meal: {}, settings: {}, chatbot: {} })),
}));
vi.mock("@/api/modules", () => ({
  getModules: vi.fn(async () => ({ enabled: [] })),
  getModulesCatalog: vi.fn(async () => ({ packages: [] })),
}));

const settings = {
  exam_kinds: [], attendance_statuses: [], grade_bands: [], max_file_bytes: 5 * 1024 * 1024,
  chatbot_history_turns: 10, max_chatbot_threads: 50, max_chatbot_message_len: 4000,
  meal_slots: [], dietary_tags: [], meal_cancel_cutoff_minutes: null,
  branches: [], excuse_kinds: [], max_excused_absent_days: null,
  max_unexcused_absent_days: null, timezone: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("comma-separated school vocabularies remain editable and save as lists", async () => {
  getSettings.mockResolvedValue(settings);
  patchSettings.mockImplementation(async (patch) => ({ ...settings, ...patch }));
  render(() => <PreferencesProvider><SettingsPage /></PreferencesProvider>);

  fireEvent.click(await screen.findByRole("tab", { name: /System|Sistem/ }));
  const branches = await screen.findByLabelText(/Teaching subjects|Branşlar/);
  fireEvent.input(branches, { target: { value: "Math," } });
  expect((branches as HTMLInputElement).value).toBe("Math,");
  fireEvent.input(branches, { target: { value: "Math, Science" } });
  fireEvent.click(screen.getAllByRole("button", { name: /Save|Kaydet/ })[0]);

  await waitFor(() => expect(patchSettings).toHaveBeenCalledWith({ branches: ["Math", "Science"] }));
});
