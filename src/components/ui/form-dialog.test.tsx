import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { FormDialog } from "@/components/ui/form-dialog";

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("form dialog stays open when the backdrop is pressed", async () => {
  function TestFormDialog() {
    const [open, setOpen] = createSignal(true);
    return (
      <>
        <span>{open() ? "open" : "closed"}</span>
        <FormDialog open={open()} onOpenChange={setOpen} title="Edit item">
          <p>Body</p>
        </FormDialog>
      </>
    );
  }

  render(() => <TestFormDialog />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.pointerDown(document.querySelector("[data-expanded]")!);
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(screen.getByText("open")).toBeTruthy();
});

test("form dialog closes from the header close button after the gesture", async () => {
  function TestFormDialog() {
    const [open, setOpen] = createSignal(true);
    return (
      <>
        <span>{open() ? "open" : "closed"}</span>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <FormDialog open={open()} onOpenChange={setOpen} title="Edit item">
          <p>Body</p>
        </FormDialog>
      </>
    );
  }

  render(() => <TestFormDialog />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.click(screen.getByLabelText("Close"));
  expect(screen.getByText("open")).toBeTruthy();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.getByText("closed")).toBeTruthy();
});
