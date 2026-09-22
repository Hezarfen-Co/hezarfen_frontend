import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { GmailComposeBox } from "@/components/messages/gmail-compose-box";
import { PreferencesProvider } from "@/stores/preferences-context";

vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "user-1", username: "teacher", role: "teacher" }) }),
}));
vi.mock("@/api/messages", () => ({ postMessage: vi.fn() }));
// The real picker searches the API; a plain button stands in for choosing someone.
vi.mock("@/components/users/user-search-select", () => ({
  UserSearchSelect: (props: { onChange: (id: string) => void }) => (
    <button type="button" onClick={() => props.onChange("user-2")}>pick recipient</button>
  ),
}));
vi.mock("@/components/ui/rich-text-editor", () => ({ RichTextEditor: () => <div /> }));

afterEach(cleanup);

test("send stays disabled until there is a recipient and a subject, and says what is missing", () => {
  render(() => (
    <PreferencesProvider>
      <GmailComposeBox open onClose={() => {}} onSuccess={() => {}} />
    </PreferencesProvider>
  ));

  const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
  expect(send.disabled).toBe(true);
  expect(screen.getByText("Choose a recipient to send.")).toBeTruthy();

  fireEvent.click(screen.getByText("pick recipient"));
  expect(send.disabled).toBe(true);
  expect(screen.getByText("Add a subject to send.")).toBeTruthy();

  fireEvent.input(screen.getByLabelText("Subject"), { target: { value: "  " } });
  expect(send.disabled).toBe(true);

  fireEvent.input(screen.getByLabelText("Subject"), { target: { value: "Veli toplantısı" } });
  expect(send.disabled).toBe(false);
  expect(screen.queryByText("Add a subject to send.")).toBeNull();
});
