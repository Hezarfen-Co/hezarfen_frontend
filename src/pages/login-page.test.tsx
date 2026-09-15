import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import LoginPage from "@/pages/login-page";

const { navigate, postLogin, postLogout, postSelectSchool, refresh } = vi.hoisted(() => ({
  navigate: vi.fn(),
  postLogin: vi.fn(),
  postLogout: vi.fn(),
  postSelectSchool: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { children: unknown }) => <a>{props.children}</a>,
  useNavigate: () => navigate,
}));
vi.mock("@/api/auth", () => ({ postLogin, postLogout, postSelectSchool }));
vi.mock("@/api/limits", () => ({
  getLimits: async () => ({
    user: { min_username_len: 3, max_username_len: 32, min_password_len: 6, max_password_len: 128 },
  }),
}));
vi.mock("@/components/layout/guest-guard", () => ({
  GuestGuard: (props: { children: unknown }) => props.children,
}));
vi.mock("@/stores/auth-context", () => ({ useAuth: () => ({ refresh }) }));
vi.mock("@/stores/preferences-context", () => ({
  useT: () => (key: string, params?: Record<string, string>) =>
    params?.username ? `${key}:${params.username}` : key,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("refreshes auth and opens the app after a single-school login", async () => {
  postLogin.mockResolvedValue({ id: "u1", username: "ada", role: "student" });
  refresh.mockResolvedValue({ id: "u1", username: "ada", role: "student" });

  render(() => <LoginPage />);

  fireEvent.input(screen.getByLabelText("auth.username"), { target: { value: "ada" } });
  fireEvent.input(screen.getByLabelText("auth.password"), { target: { value: "secret1" } });
  fireEvent.click(screen.getByRole("button", { name: "auth.login" }));

  await waitFor(() => {
    expect(postLogin).toHaveBeenCalledWith({ username: "ada", password: "secret1" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({ to: "/" });
  });
});

test("logs in without a school and completes the multi-school selection", async () => {
  postLogin.mockResolvedValue({
    username: "ada",
    schools: [
      { slug: "alpha", name: "Alpha School" },
      { slug: "beta", name: "Beta School" },
    ],
  });
  postSelectSchool.mockResolvedValue({ id: "u1", username: "ada", role: "student" });
  refresh.mockResolvedValue({ id: "u1", username: "ada", role: "student" });

  render(() => <LoginPage />);

  fireEvent.input(screen.getByLabelText("auth.username"), { target: { value: "ada" } });
  fireEvent.input(screen.getByLabelText("auth.password"), { target: { value: "secret1" } });
  fireEvent.click(screen.getByRole("button", { name: "auth.login" }));

  await waitFor(() => expect(postLogin).toHaveBeenCalledWith({ username: "ada", password: "secret1" }));
  expect(await screen.findByRole("heading", { name: "auth.chooseSchoolTitle" })).toBeTruthy();
  expect(screen.getByText("auth.chooseSchoolSubtitle:ada")).toBeTruthy();

  fireEvent.click(screen.getByText("Alpha School").closest("button")!);

  await waitFor(() => {
    expect(postSelectSchool).toHaveBeenCalledWith({ school: "alpha" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({ to: "/" });
  });
});
