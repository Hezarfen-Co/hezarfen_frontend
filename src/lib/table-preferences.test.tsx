import { fireEvent, render, screen } from "@solidjs/testing-library";
import {
  createTablePreferences,
  defaultTablePreferences,
  readTablePreferences,
} from "@/lib/table-preferences";

const key = "users";
const storageKey = `hezarfen.table.${key}`;

beforeEach(() => localStorage.clear());

test("reads saved widths, visibility and density", () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      sizing: { name: 240 },
      visibility: { email: false },
      density: "comfortable",
    }),
  );

  expect(readTablePreferences(key)).toEqual({
    sizing: { name: 240 },
    visibility: { email: false },
    density: "comfortable",
  });
});

test("falls back to compact defaults for broken storage", () => {
  localStorage.setItem(storageKey, "{broken");
  expect(readTablePreferences(key)).toEqual(defaultTablePreferences);

  localStorage.setItem(storageKey, JSON.stringify({ density: "huge" }));
  expect(readTablePreferences(key).density).toBe("compact");
});

function PreferencesProbe() {
  const controller = createTablePreferences(key);
  return (
    <>
      <output data-testid="preferences">{JSON.stringify(controller.preferences())}</output>
      <button type="button" onClick={() => controller.setSizing({ name: 320 })}>width</button>
      <button type="button" onClick={() => controller.setVisibility({ email: false })}>visibility</button>
      <button type="button" onClick={() => controller.setDensity("normal")}>density</button>
    </>
  );
}

test("persists width, visibility and density changes", () => {
  render(() => <PreferencesProbe />);

  fireEvent.click(screen.getByRole("button", { name: "width" }));
  fireEvent.click(screen.getByRole("button", { name: "visibility" }));
  fireEvent.click(screen.getByRole("button", { name: "density" }));

  expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}")).toEqual({
    sizing: { name: 320 },
    visibility: { email: false },
    density: "normal",
  });
  expect(screen.getByTestId("preferences").textContent).toContain('"density":"normal"');
});
