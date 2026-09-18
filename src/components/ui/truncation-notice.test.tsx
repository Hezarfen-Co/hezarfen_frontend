import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import { TruncationNotice } from "@/components/ui/truncation-notice";
import { PreferencesProvider } from "@/stores/preferences-context";

afterEach(cleanup);

test("says how many rows were left out and loads the rest on request", () => {
  const onLoadAll = vi.fn();
  render(() => (
    <PreferencesProvider>
      <TruncationNotice shown={100} total={340} onLoadAll={onLoadAll} />
    </PreferencesProvider>
  ));
  expect(screen.getByRole("status").textContent).toContain("340");
  fireEvent.click(screen.getByRole("button"));
  expect(onLoadAll).toHaveBeenCalledOnce();
});

test("stays hidden when every row is on screen", () => {
  const { container } = render(() => (
    <PreferencesProvider>
      <TruncationNotice shown={12} total={12} onLoadAll={() => undefined} />
    </PreferencesProvider>
  ));
  expect(container.textContent).toBe("");
});
