import { fireEvent, render, screen } from "@solidjs/testing-library";
import {
  createTablePreferences,
  defaultTablePreferences,
  readTablePreferences,
} from "@/lib/table-preferences";

const key = "users";
const storageKey = `hezarfen.table.${key}`;

beforeEach(() => localStorage.clear());

test("reads saved visibility", () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({ visibility: { email: false } }),
  );

  expect(readTablePreferences(key)).toEqual({ visibility: { email: false } });
});

test("falls back to defaults for broken storage", () => {
  localStorage.setItem(storageKey, "{broken");
  expect(readTablePreferences(key)).toEqual(defaultTablePreferences);
});

function PreferencesProbe() {
  const controller = createTablePreferences(key);
  return (
    <>
      <output data-testid="preferences">{JSON.stringify(controller.preferences())}</output>
      <button type="button" onClick={() => controller.setVisibility({ email: false })}>visibility</button>
    </>
  );
}

test("persists visibility changes", () => {
  render(() => <PreferencesProbe />);

  fireEvent.click(screen.getByRole("button", { name: "visibility" }));

  expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}")).toEqual({
    visibility: { email: false },
  });
  expect(screen.getByTestId("preferences").textContent).toContain('"email":false');
});
