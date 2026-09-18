import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PreferencesProvider } from "@/stores/preferences-context";

const OPTIONS = [
  { value: "m", label: "9-A · Matematik" },
  { value: "t", label: "10-B · Türkçe" },
];

afterEach(cleanup);

function renderSelect(onChange = vi.fn()) {
  render(() => (
    <PreferencesProvider>
      <SearchableSelect value="" onChange={onChange} options={OPTIONS} placeholder="Seç" />
    </PreferencesProvider>
  ));
  return { input: screen.getByRole("combobox"), onChange };
}

it("1. opens the option list on a plain click on the field", async () => {
  const { input } = renderSelect();

  // No typing, no chevron: the field itself is the affordance.
  fireEvent.click(input);

  await waitFor(() => expect(screen.getByRole("option", { name: "9-A · Matematik" })).toBeTruthy());
  expect(screen.getByRole("option", { name: "10-B · Türkçe" })).toBeTruthy();
});

it("2. closes again when the open field is clicked", async () => {
  const { input } = renderSelect();

  fireEvent.click(input);
  await screen.findByRole("option", { name: "9-A · Matematik" });

  fireEvent.click(input);

  await waitFor(() => expect(screen.queryByRole("option")).toBeNull());
});

it("3. reports the picked value and stays closed after the pick", async () => {
  const { input, onChange } = renderSelect();

  fireEvent.click(input);
  fireEvent.click(await screen.findByRole("option", { name: "10-B · Türkçe" }));

  await waitFor(() => expect(onChange).toHaveBeenCalledWith("t"));
  // The close → refocus dance must not re-open the list by itself.
  await waitFor(() => expect(screen.queryByRole("option")).toBeNull());
});

it("4. closes when clicking outside the field", async () => {
  const { input } = renderSelect();

  fireEvent.click(input);
  await screen.findByRole("option", { name: "9-A · Matematik" });

  // Kobalte attaches its document-level outside listener one macrotask after
  // it opens; a real click always lands long after that.
  const tick = Promise.withResolvers<void>();
  setTimeout(tick.resolve, 0);
  await tick.promise;
  fireEvent.pointerDown(document.body);

  await waitFor(() => expect(screen.queryByRole("option")).toBeNull());
});

it("5. closes on Escape without changing the value", async () => {
  const { input, onChange } = renderSelect();

  fireEvent.click(input);
  await screen.findByRole("option", { name: "9-A · Matematik" });

  fireEvent.keyDown(input, { key: "Escape" });

  await waitFor(() => expect(screen.queryByRole("option")).toBeNull());
  expect(onChange).not.toHaveBeenCalled();
});

it("6. opens on ArrowDown from the closed field", async () => {
  const { input } = renderSelect();

  fireEvent.keyDown(input, { key: "ArrowDown" });

  await waitFor(() => expect(screen.getByRole("option", { name: "9-A · Matematik" })).toBeTruthy());
});

it("7. chevron toggles the list open and closed", async () => {
  const { onChange } = renderSelect();

  // Opened from the chevron, not the field: the trigger must still open.
  // Kobalte toggles on pointerdown (a bare click event never reaches it).
  const trigger = screen.getByRole("button");
  fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
  await screen.findByRole("option", { name: "9-A · Matematik" });

  fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });

  await waitFor(() => expect(screen.queryByRole("option")).toBeNull());
  expect(onChange).not.toHaveBeenCalled();
});

it("finds an option across a dash and word order", async () => {
  const { input } = renderSelect();

  fireEvent.input(input, { target: { value: "9a matematik" } });

  await waitFor(() => expect(screen.getByRole("option", { name: "9-A · Matematik" })).toBeTruthy());
  expect(screen.queryByRole("option", { name: "10-B · Türkçe" })).toBeNull();
});

it("finds an option typed without its Turkish diacritics", async () => {
  const { input } = renderSelect();

  fireEvent.input(input, { target: { value: "turkce" } });

  await waitFor(() => expect(screen.getByRole("option", { name: "10-B · Türkçe" })).toBeTruthy());
});

it("says so when the search matches nothing", async () => {
  const { input } = renderSelect();

  fireEvent.input(input, { target: { value: "fizik" } });

  await waitFor(() => expect(screen.getByText("No results.")).toBeTruthy());
});
