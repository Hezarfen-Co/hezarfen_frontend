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
      // A full first page (50) of a 55-message trash: the rest is not loaded yet.
      ? { items: Array.from({ length: 50 }, (_, i) => message(i + 1)), total: 55, limit: 50, offset: 0 }
      : { items: [], total: 0, limit: 50, offset: 0 },
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
  expect(dialog.textContent).toMatch(/50 mesaj|50 messages/);
  expect(dialog.textContent).toMatch(/toplam 55|55 in trash/);
  expect(deleteMessageById).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole("button", { name: /Empty trash|Çöp kutusunu boşalt/ }));
  await waitFor(() => expect(deleteMessageById).toHaveBeenCalledTimes(50));
});

test("searching hits the server with a trimmed q at first-page offset", async () => {
  getMessages.mockResolvedValue({ items: [message(1)], total: 1, limit: 50, offset: 0 });

  render(() => (
    <PreferencesProvider>
      <MessagesPage />
    </PreferencesProvider>
  ));

  const search = await screen.findByPlaceholderText(/Search messages|Mesajlarda ara/);
  fireEvent.input(search, { target: { value: "  Subject 7  " } });

  await waitFor(() =>
    expect(getMessages).toHaveBeenCalledWith("inbox", { limit: 50, offset: 0, q: "Subject 7" }),
  );
});
