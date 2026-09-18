import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import MessagesPage from "@/pages/messages-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getMessages, deleteMessageById } = vi.hoisted(() => ({
  getMessages: vi.fn(),
  deleteMessageById: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
  Navigate: () => null,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "user-1", username: "teacher", role: "teacher" }),
    loading: () => false,
    error: () => undefined,
  }),
}));
vi.mock("@/api/messages", () => ({
  getMessages,
  deleteMessageById,
  patchMessageById: vi.fn(),
  postMessage: vi.fn(),
}));

const message = (n: number) => ({
  id: `m-${n}`,
  sender: { id: "user-2", username: "sender" },
  recipient: { id: "user-1", username: "teacher" },
  subject: `Subject ${n}`,
  body: "body",
  sent_at: n,
  read: true,
});

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("emptying trash waits for confirmation and names what it deletes", async () => {
  getMessages.mockImplementation(async (folder: string) =>
    folder === "trash"
      ? { items: [message(1), message(2)], total: 5, limit: 30, offset: 0 }
      : { items: [], total: 0, limit: 30, offset: 0 },
  );
  deleteMessageById.mockResolvedValue(undefined);

  render(() => (
    <PreferencesProvider>
      <MessagesPage />
    </PreferencesProvider>
  ));

  const trashFolder = (await screen.findAllByRole("button", { name: /^(Trash|Çöp kutusu)$/ }))[0];
  fireEvent.click(trashFolder);
  fireEvent.click(await screen.findByRole("button", { name: /Empty trash|Çöp kutusunu boşalt/ }));

  const dialog = await screen.findByRole("alertdialog");
  expect(dialog.textContent).toMatch(/2 mesaj|2 messages/);
  expect(dialog.textContent).toMatch(/toplam 5|5 in trash/);
  expect(deleteMessageById).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole("button", { name: /Empty trash|Çöp kutusunu boşalt/ }));
  await waitFor(() => expect(deleteMessageById).toHaveBeenCalledTimes(2));
});
