import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("dialog closes when backdrop is pressed", async () => {
  function TestDialog() {
    const [open, setOpen] = createSignal(true);
    return (
      <>
        <span>{open() ? "open" : "closed"}</span>
        <Dialog open={open()} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Test dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  render(() => <TestDialog />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.pointerDown(document.querySelector("[data-expanded]")!);

  expect(screen.getByText("closed")).toBeTruthy();
});
