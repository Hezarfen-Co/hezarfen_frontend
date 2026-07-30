import { fireEvent, render, screen } from "@solidjs/testing-library";
import { Show } from "solid-js";
import QuestionBankPage from "@/pages/question-bank-page";
import { PreferencesProvider } from "@/stores/preferences-context";

// 11 templates, page size 10: the last page holds exactly one row.
let templates = Array.from({ length: 11 }, (_, index) => ({
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

test("deleting the last row of the last page clamps back instead of stranding the user", async () => {
  render(() => (
    <PreferencesProvider>
      <QuestionBankPage />
    </PreferencesProvider>
  ));

  fireEvent.click(await screen.findByRole("button", { name: "Next" }));
  expect(await screen.findByText("Template 10")).toBeTruthy();
  expect(screen.getByText("2 / 2")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "delete-row" }));
  fireEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
  await tick();
  await tick();

  // 10 left → one page: the user must be on it, not on the vanished page 2.
  expect(screen.queryByText("Template 10")).toBeNull();
  expect(await screen.findByText("Template 0")).toBeTruthy();
});
