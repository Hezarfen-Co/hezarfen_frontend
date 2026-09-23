import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/confirm-dialog";
import { PreferencesProvider } from "@/stores/preferences-context";

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(overrides: Partial<ConfirmDialogProps> = {}) {
  const [open, setOpen] = createSignal(true);
  render(() => (
    <PreferencesProvider>
      <span data-testid="state">{open() ? "open" : "closed"}</span>
      <ConfirmDialog
        open={open()}
        onOpenChange={setOpen}
        title="Delete note"
        variant="destructive"
        summary="Quarterly plan"
        onConfirm={() => {}}
        {...overrides}
      />
    </PreferencesProvider>
  ));
}

const cancelButton = () => screen.getByRole("button", { name: /^(Cancel|İptal|Vazgeç)$/ });
const confirmButton = () => screen.getByRole("button", { name: /^(Yes, delete|Evet, sil)$/ });

test("destructive dialog shows title, target and the irreversible note, focused on Cancel", async () => {
  mount();
  expect(await screen.findByText("Delete note")).toBeTruthy();
  const summary = screen.getByText("Quarterly plan");
  expect(summary.closest("[data-slot=confirm-summary]")?.getAttribute("title")).toBe("Quarterly plan");
  expect(screen.getByText(/This can't be undone\.|Bu işlem geri alınamaz\./)).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(cancelButton()));
});

test("an explicit description replaces the default sentence", async () => {
  mount({ description: "Students lose access." });
  expect(await screen.findByText("Students lose access.")).toBeTruthy();
  expect(screen.queryByText(/This can't be undone\.|Bu işlem geri alınamaz\./)).toBeNull();
});

test("confirm shows a spinner and stays disabled until onConfirm settles, then closes", async () => {
  let resolve!: () => void;
  const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
  mount({ onConfirm });
  await screen.findByText("Delete note");

  fireEvent.click(confirmButton());
  fireEvent.click(confirmButton());
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await waitFor(() => expect((confirmButton() as HTMLButtonElement).disabled).toBe(true));
  expect(document.querySelector("[data-slot=confirm-spinner]")).toBeTruthy();
  expect(screen.getByTestId("state").textContent).toBe("open");

  resolve();
  await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("closed"));
});

test("cancel closes without confirming", async () => {
  const onConfirm = vi.fn();
  mount({ onConfirm });
  await screen.findByText("Delete note");
  fireEvent.click(cancelButton());
  await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("closed"));
  expect(onConfirm).not.toHaveBeenCalled();
});
