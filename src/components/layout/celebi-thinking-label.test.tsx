import { render, screen } from "@solidjs/testing-library";
import { CelebiThinkingLabel } from "@/components/layout/celebi-thinking-label";
import { PreferencesProvider } from "@/stores/preferences-context";

test("shows the first thinking phrase immediately", () => {
  render(() => (
    <PreferencesProvider>
      <CelebiThinkingLabel />
    </PreferencesProvider>
  ));
  expect(screen.getByText("Çelebi is thinking…")).toBeTruthy();
});

test("rotates to the next phrase after the interval", () => {
  vi.useFakeTimers();
  render(() => (
    <PreferencesProvider>
      <CelebiThinkingLabel />
    </PreferencesProvider>
  ));
  vi.advanceTimersByTime(1_800);
  expect(screen.getByText("Looking into it…")).toBeTruthy();
  vi.useRealTimers();
});
