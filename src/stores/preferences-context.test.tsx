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

test("sidebar collapse preference loads and persists", () => {
  localStorage.setItem("hezarfen.sidebarCollapsed", "1");
  render(() => <PreferencesProvider><SidebarPreferenceProbe /></PreferencesProvider>);

  expect(screen.getByRole("button").textContent).toBe("collapsed");
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("expanded");
  expect(localStorage.getItem("hezarfen.sidebarCollapsed")).toBe("0");
});
