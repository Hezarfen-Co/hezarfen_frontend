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
