import { fireEvent, render, screen } from "@solidjs/testing-library";
import { PreferencesProvider, usePreferences } from "@/stores/preferences-context";

vi.mock("@/api/users", () => ({ patchMyPreferences: vi.fn().mockResolvedValue({}) }));

function SidebarPreferenceProbe() {
  const preferences = usePreferences();
  return (
    <button type="button" onClick={() => preferences.toggleSidebar()}>
      {preferences.sidebarCollapsed() ? "collapsed" : "expanded"}
    </button>
  );
}

function PalettePreferenceProbe() {
  const preferences = usePreferences();
  return (
    <button
      type="button"
      onClick={() => preferences.setPaletteColor(preferences.paletteColor() ? null : "#fefae0")}
    >
      {preferences.paletteColor() ?? "default"}
    </button>
  );
}

test("sidebar collapse preference loads and persists", () => {
  localStorage.setItem("hezarfen.sidebarCollapsed", "1");
  render(() => <PreferencesProvider><SidebarPreferenceProbe /></PreferencesProvider>);

  expect(screen.getByRole("button").textContent).toBe("collapsed");
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("expanded");
  expect(localStorage.getItem("hezarfen.sidebarCollapsed")).toBe("0");
});

test("preferences stay usable when browser storage writes fail", () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });

  render(() => <PreferencesProvider><SidebarPreferenceProbe /></PreferencesProvider>);
  fireEvent.click(screen.getByRole("button"));

  expect(screen.getByRole("button").textContent).toBe("collapsed");
  setItem.mockRestore();
});

test("palette color applies theme-aware light/dark variants, persists, and resets", () => {
  localStorage.removeItem("hezarfen.paletteColor");
  render(() => <PreferencesProvider><PalettePreferenceProbe /></PreferencesProvider>);

  fireEvent.click(screen.getByRole("button"));
  expect(localStorage.getItem("hezarfen.paletteColor")).toBe("#fefae0");
  // Same hue for both themes, but lightness is pinned per theme (not the
  // swatch's own near-white lightness) so the accent stays legible either way.
  expect(document.documentElement.style.getPropertyValue("--accent-light")).toBe("52 88% 40%");
  expect(document.documentElement.style.getPropertyValue("--accent-light-fg")).toBe("210 10.8% 14.5%");
  expect(document.documentElement.style.getPropertyValue("--accent-dark")).toBe("52 88% 68%");
  expect(document.documentElement.style.getPropertyValue("--accent-dark-fg")).toBe("210 10.8% 14.5%");

  fireEvent.click(screen.getByRole("button"));
  expect(localStorage.getItem("hezarfen.paletteColor")).toBeNull();
  expect(document.documentElement.style.getPropertyValue("--accent-light")).toBe("");
  expect(document.documentElement.style.getPropertyValue("--accent-dark")).toBe("");
});
