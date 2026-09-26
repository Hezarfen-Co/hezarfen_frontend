import { fireEvent, render, screen } from "@solidjs/testing-library";
import { Show } from "solid-js";
import QuestionBankPage from "@/pages/question-bank-page";
import { PreferencesProvider } from "@/stores/preferences-context";

// More templates than one scroll page (50) holds.
let templates = Array.from({ length: 60 }, (_, index) => ({
  id: `bq-${index}`,
  text: `Template ${index}`,
  kind: "text",
  points: 1,
  subject: "s-1",
  subject_name: "Algebra",
  visibility: "private",
  owner: "u-1",
  owner_name: "Teacher",
  used_count: 0,
  created_at: 0,
}));

vi.mock("@/api/bank-questions", () => ({
  getBankQuestions: async (params: { limit: number; offset: number }) => ({
    items: templates.slice(params.offset, params.offset + params.limit),
    total: templates.length,
  }),
  deleteBankQuestionById: async (id: string) => {
    templates = templates.filter((item) => item.id !== id);
  },
}));
vi.mock("@/api/courses", () => ({ getCourses: async () => ({ items: [] }) }));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "u-1", role: "teacher" }),
    loading: () => false,
    error: () => undefined,
    refresh: async () => {},
  }),
}));
// Kobalte's dropdown/dialog chrome is not what this test is about — flatten both
// to plain buttons so the delete path can be driven in jsdom.
vi.mock("@/components/ui/table-row-actions", () => ({
  TableRowActions: (props: { actions: { label: string; destructive?: boolean; onSelect: () => void }[] }) => (
    <button type="button" onClick={() => props.actions.find((action) => action.destructive)?.onSelect()}>
      delete-row
    </button>
  ),
}));
vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: (props: { open: boolean; onConfirm: () => void | Promise<void> }) => (
    <Show when={props.open}>
      <button type="button" onClick={() => void props.onConfirm()}>
        confirm-delete
      </button>
    </Show>
  ),
}));

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => vi.restoreAllMocks());

test("fetches one page at a time and starts over from the top after a delete", async () => {
  render(() => (
    <PreferencesProvider>
      <QuestionBankPage />
    </PreferencesProvider>
  ));

  // Only the first page is fetched until the reader scrolls.
  expect(await screen.findByText("Template 49")).toBeTruthy();
  expect(screen.queryByText("Template 50")).toBeNull();

  fireEvent.click(screen.getAllByRole("button", { name: "delete-row" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
  await tick();
  await tick();

  // The list reloads from offset 0: the deleted row is gone and the next one
  // moves up into the first page.
  expect(screen.queryByText("Template 0")).toBeNull();
  expect(await screen.findByText("Template 50")).toBeTruthy();
});
