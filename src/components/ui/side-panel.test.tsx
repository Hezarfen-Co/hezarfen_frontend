import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SidePanel } from "@/components/ui/side-panel";
import { PreferencesProvider } from "@/stores/preferences-context";

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(dirty: boolean) {
  const [open, setOpen] = createSignal(true);
  render(() => (
    <PreferencesProvider>
      <span data-testid="state">{open() ? "open" : "closed"}</span>
      <SidePanel open={open()} onOpenChange={setOpen} title="New class" dirty={dirty}>
        <input aria-label="Name" />
      </SidePanel>
    </PreferencesProvider>
  ));
}

const confirmTitle = /Discard your changes\?|Değişiklikler silinsin mi\?/;
const closeButton = () => screen.getAllByRole("button", { name: /^(Close|Kapat)$/ })[0];

test("a clean panel closes straight away", async () => {
  mount(false);
  fireEvent.click(closeButton());
  await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("closed"));
});

test("a dirty panel asks before discarding, and stays open on Keep editing", async () => {
  mount(true);
  fireEvent.click(closeButton());

  expect(await screen.findByText(confirmTitle)).toBeTruthy();
  expect(screen.getByTestId("state").textContent).toBe("open");

  fireEvent.click(screen.getByRole("button", { name: /Keep editing|Düzenlemeye devam et/ }));
  await waitFor(() => expect(screen.queryByText(confirmTitle)).toBeNull());
  expect(screen.getByTestId("state").textContent).toBe("open");

  fireEvent.click(closeButton());
  fireEvent.click(await screen.findByRole("button", { name: /^(Discard|Sil ve kapat)$/ }));
  await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("closed"));
});

test("the panel is announced as a dialog, not an alert dialog", () => {
  mount(false);
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

test("guardUnsaved asks only once something was typed", async () => {
  const [open, setOpen] = createSignal(true);
  render(() => (
    <PreferencesProvider>
      <span data-testid="state">{open() ? "open" : "closed"}</span>
      <SidePanel open={open()} onOpenChange={setOpen} title="New meal" guardUnsaved>
        <input aria-label="Slot" />
      </SidePanel>
    </PreferencesProvider>
  ));

  fireEvent.input(screen.getByLabelText("Slot"), { target: { value: "Lunch" } });
  fireEvent.click(closeButton());
  expect(await screen.findByText(confirmTitle)).toBeTruthy();
  expect(screen.getByTestId("state").textContent).toBe("open");
});
