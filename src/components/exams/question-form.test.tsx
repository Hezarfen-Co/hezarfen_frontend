import { fireEvent, render, screen } from "@solidjs/testing-library";
import type { QuestionFormInitial, QuestionValues } from "@/components/exams/question-form";
import { QuestionForm } from "@/components/exams/question-form";
import { PreferencesProvider } from "@/stores/preferences-context";

// The form loads school settings only for the upload size cap; keep it off the network.
vi.mock("@/api/settings", () => ({ getSettings: async () => ({ max_file_bytes: 5_000_000 }) }));

const subjects = [
  { id: "s-1", name: "Algebra" },
  { id: "s-2", name: "Geometry" },
] as never as { id: string; name: string }[];

function mount(props: Partial<Parameters<typeof QuestionForm>[0]> = {}) {
  const onSubmit = vi.fn(async (_values: QuestionValues) => {});
  const result = render(() => (
    <PreferencesProvider>
      <QuestionForm subjects={subjects as never} onSubmit={onSubmit} onCancel={() => {}} {...props} />
    </PreferencesProvider>
  ));
  const submit = () => fireEvent.submit(result.container.querySelector("form")!);
  return { ...result, onSubmit, submit };
}

const type = (el: Element, value: string) => fireEvent.input(el, { target: { value } });

afterEach(() => vi.restoreAllMocks());

describe("stored subject that is not pickable", () => {
  const initial: QuestionFormInitial = {
    subject: "s-gone",
    text: "What is 2 + 2?",
    kind: "text",
    points: 1,
    choices: null,
    correct: null,
  };

  test("shows it as an explicit disabled option instead of silently swapping", () => {
    mount({ initial });
    const select = screen.getByLabelText("Subject") as HTMLSelectElement;
    expect(select.value).toBe("s-gone");
    const option = Array.from(select.options).find((o) => o.value === "s-gone")!;
    expect(option.disabled).toBe(true);
    expect(option.textContent).toContain("no longer available");
  });

  test("blocks submit until a pickable subject is chosen", async () => {
    const { onSubmit, submit, container } = mount({ initial });
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    // Same wording sits under the select as help text, so read the error box itself.
    expect(container.querySelector('[class*="bg-destructive/10"]')?.textContent).toMatch(
      /not in the list you can pick from/i,
    );

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "s-2" } });
    await submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].subject_id).toBe("s-2");
  });
});

describe("correct answer", () => {
  test("nothing is pre-marked on a fresh form", () => {
    mount();
    // Every marker button still shows its letter; a marked row shows a check icon instead.
    const markers = screen.getAllByTitle("Mark correct");
    expect(markers.map((m) => m.textContent)).toEqual(["A", "B", "C", "D"]);
  });

  test("submit is blocked with a message when no choice is marked", async () => {
    const { onSubmit, submit, container } = mount();
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "s-1" } });
    type(container.querySelector("#question-text")!, "Pick one");
    const choiceInputs = container.querySelectorAll("[data-choice-id] input:not([type=file])");
    type(choiceInputs[0], "four");
    type(choiceInputs[1], "five");
    await submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Mark one choice as the correct answer/i)).toBeTruthy();

    fireEvent.click(screen.getAllByTitle("Mark correct")[1]);
    await submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values.correct).toBe(values.choices![1].id);
  });
});

test("a stored option keeps its own image after the rows above it are removed", () => {
  const initial: QuestionFormInitial = {
    subject: "s-1",
    text: "Which one?",
    kind: "choice",
    points: 1,
    choices: [
      { id: "c-1", text: "Alpha" },
      { id: "c-2", text: "Bravo" },
      { id: "c-3", text: "Charlie" },
      { id: "c-4", text: "Delta" },
    ],
    correct: "c-2",
    // Only Bravo has a picture; it must stay on Bravo whatever row it sits in.
    choice_images: [null, { name: "bravo.png", size: 10, mime: "image/png" } as never, null, null],
  };
  const { container } = mount({ initial, choiceImageSrc: (id: string) => `/img/${id}` });

  const imageOf = (choiceId: string) =>
    container.querySelector(`[data-choice-id="${choiceId}"] img`)?.getAttribute("src") ?? null;
  expect(imageOf("c-2")).toBe("/img/c-2");

  // Drop Alpha: Bravo slides up to the first row.
  fireEvent.click(container.querySelector('[data-choice-id="c-1"] button:last-of-type')!);
  expect(container.querySelector('[data-choice-id="c-1"]')).toBeNull();
  expect(imageOf("c-2")).toBe("/img/c-2");
  for (const id of ["c-3", "c-4"]) expect(imageOf(id)).toBeNull();
});
