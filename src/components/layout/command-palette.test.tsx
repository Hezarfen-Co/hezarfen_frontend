import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CommandPalette } from "@/components/layout/command-palette";
import { PreferencesProvider } from "@/stores/preferences-context";

vi.mock("@tanstack/solid-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "u-1", username: "teacher", role: "teacher" }),
    loading: () => false,
    error: () => undefined,
  }),
}));
vi.mock("@/stores/modules-context", () => ({
  useModules: () => ({ enabled: () => null, loading: () => false, isEnabled: () => true, refresh: () => {} }),
}));
vi.mock("@/api/users", () => ({ getUserSearch: vi.fn(async () => ({ items: [], total: 0, limit: 10, offset: 0 })) }));
vi.mock("@/api/classes", () => ({ getMyClasses: vi.fn(async () => ({ items: [], total: 0, limit: 10, offset: 0 })) }));

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("the palette is a combobox whose active option follows the arrow keys", async () => {
  render(() => (
    <PreferencesProvider>
      <CommandPalette open onOpenChange={() => {}} />
    </PreferencesProvider>
  ));

  const field = await screen.findByRole("combobox");
  const list = screen.getByRole("listbox");
  expect(field.getAttribute("aria-controls")).toBe(list.id);

  const options = screen.getAllByRole("option");
  expect(options.length).toBeGreaterThan(1);
  expect(field.getAttribute("aria-activedescendant")).toBe(options[0].id);
  expect(options[0].getAttribute("aria-selected")).toBe("true");

  fireEvent.keyDown(field, { key: "ArrowDown" });
  expect(field.getAttribute("aria-activedescendant")).toBe(options[1].id);
  expect(options[1].getAttribute("aria-selected")).toBe("true");
});
