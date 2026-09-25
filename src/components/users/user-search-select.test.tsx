import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, expect, it, vi } from "vitest";
import type { PersonRef } from "@/api/client";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { PreferencesProvider } from "@/stores/preferences-context";

const getUserSearch = vi.fn();
const getUserById = vi.fn();

vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ role: "manager" }) }),
}));
vi.mock("@/api/users", () => ({
  getUserById: (...args: unknown[]) => getUserById(...args),
  getUserSearch: (...args: unknown[]) => getUserSearch(...args),
}));

const ada: PersonRef = { id: "ada", username: "ada", display_name: "Ada Yılmaz" };
const mehmet: PersonRef = { id: "mehmet", username: "mehmet", display_name: "Mehmet Kaya" };

afterEach(() => {
  cleanup();
  getUserSearch.mockReset();
  getUserById.mockReset();
});

it("clears a clicked user's search without clearing the selected user", async () => {
  getUserSearch.mockImplementation(async (query: string) => ({
    items: query ? [mehmet] : [ada, mehmet],
  }));
  getUserById.mockResolvedValue(ada);
  const [value, setValue] = createSignal(ada.id);
  const onChange = vi.fn((next: string) => setValue(next));
  render(() => (
    <PreferencesProvider>
      <UserSearchSelect id="student" value={value()} onChange={onChange} initialUser={ada} />
    </PreferencesProvider>
  ));
  const input = screen.getByRole("combobox") as HTMLInputElement;

  await waitFor(() => expect(input.value).toBe("Ada Yılmaz (ada)"));
  fireEvent.click(input);

  expect(input.value).toBe("");
  expect(value()).toBe(ada.id);
  expect(onChange).not.toHaveBeenCalled();
  await waitFor(() => expect(getUserSearch).toHaveBeenCalledWith("", expect.any(AbortSignal), undefined));
  await screen.findByRole("option", { name: /Mehmet Kaya/ });

  fireEvent.input(input, { target: { value: "meh" } });
  await waitFor(() => expect(getUserSearch).toHaveBeenCalledWith("meh", expect.any(AbortSignal), undefined));
  fireEvent.click(input);

  expect(input.value).toBe("");
  expect(value()).toBe(ada.id);
  expect(onChange).not.toHaveBeenCalled();
  await waitFor(() => expect(getUserSearch).toHaveBeenLastCalledWith("", expect.any(AbortSignal), undefined));

  fireEvent.click(await screen.findByRole("option", { name: /Mehmet Kaya/ }));
  await waitFor(() => expect(value()).toBe(mehmet.id));
  expect(onChange).toHaveBeenCalledExactlyOnceWith(mehmet.id);
});

it("clears the selected label when the chevron opens suggestions", async () => {
  getUserSearch.mockResolvedValue({ items: [ada, mehmet] });
  getUserById.mockResolvedValue(ada);
  const onChange = vi.fn();
  render(() => (
    <PreferencesProvider>
      <UserSearchSelect id="student" value={ada.id} onChange={onChange} initialUser={ada} />
    </PreferencesProvider>
  ));
  const input = screen.getByRole("combobox") as HTMLInputElement;
  await waitFor(() => expect(input.value).toBe("Ada Yılmaz (ada)"));

  fireEvent.pointerDown(screen.getByRole("button"), { pointerType: "mouse", button: 0 });

  expect(input.value).toBe("");
  await screen.findByRole("option", { name: /Mehmet Kaya/ });
  expect(onChange).not.toHaveBeenCalled();
});
