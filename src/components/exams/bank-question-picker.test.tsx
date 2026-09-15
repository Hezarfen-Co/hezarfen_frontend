import { fireEvent, render, screen } from "@solidjs/testing-library";
import { BankQuestionPicker } from "@/components/exams/bank-question-picker";
import { PreferencesProvider } from "@/stores/preferences-context";

const template = { id: "bq-1", text: "Capital of France?", kind: "choice", points: 2, choices: [], correct: null };

vi.mock("@/api/bank-questions", () => ({
  getBankQuestions: async () => ({ items: [template], total: 1 }),
}));

afterEach(() => vi.restoreAllMocks());

test("insert stays disabled until a target subject is explicitly picked", async () => {
  const onInsert = vi.fn(async () => {});
  render(() => (
    <PreferencesProvider>
      <BankQuestionPicker
        subjects={[{ id: "s-1", name: "Algebra" }] as never}
        onInsert={onInsert}
        onCancel={() => {}}
      />
    </PreferencesProvider>
  ));

  const insert = screen.getByRole("button", { name: "Add to exam" }) as HTMLButtonElement;
  expect(insert.disabled).toBe(true);

  // Picking a template is not enough — no subject is defaulted for the teacher.
  fireEvent.click(await screen.findByText("Capital of France?"));
  expect(insert.disabled).toBe(true);
  const select = screen.getByLabelText(/Subject in this exam/i) as HTMLSelectElement;
  expect(select.value).toBe("");

  fireEvent.change(select, { target: { value: "s-1" } });
  expect(insert.disabled).toBe(false);

  fireEvent.click(insert);
  await Promise.resolve();
  expect(onInsert).toHaveBeenCalledWith("bq-1", "s-1");
});

test("cancel delegates to the owning panel", () => {
  const onCancel = vi.fn();
  render(() => (
    <PreferencesProvider>
      <BankQuestionPicker
        subjects={[]}
        onInsert={async () => {}}
        onCancel={onCancel}
      />
    </PreferencesProvider>
  ));

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onCancel).toHaveBeenCalledOnce();
});
