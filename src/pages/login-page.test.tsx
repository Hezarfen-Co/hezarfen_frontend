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
      { id: "019732e3-7b00-7000-8000-00000000dead", name: "Alpha School" },
      { id: "019732e3-7b00-7000-8000-00000000beef", name: "Beta School" },
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
    expect(postSelectSchool).toHaveBeenCalledWith({ school: "019732e3-7b00-7000-8000-00000000dead" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({ to: "/" });
  });
});

test("a demo build opens the form filled and signs in with one click", async () => {
  vi.stubEnv("VITE_DEMO_LOGIN_USERNAME", "admin");
  vi.stubEnv("VITE_DEMO_LOGIN_PASSWORD", "admin123");
  postLogin.mockResolvedValue({ id: "u1", username: "admin", role: "admin" });
  refresh.mockResolvedValue({ id: "u1", username: "admin", role: "admin" });

  render(() => <LoginPage />);

  expect((screen.getByLabelText("auth.username") as HTMLInputElement).value).toBe("admin");
  fireEvent.input(screen.getByLabelText("auth.username"), { target: { value: "someone" } });
  fireEvent.click(screen.getByRole("button", { name: "auth.demoLogin:admin" }));

  await waitFor(() => expect(postLogin).toHaveBeenCalledWith({ username: "admin", password: "admin123" }));
  vi.unstubAllEnvs();
});

test("without demo settings the form uses the default demo credentials and offers no demo button", () => {
  // Stub empty: vitest also reads a developer's .env.local.
  vi.stubEnv("VITE_DEMO_LOGIN_USERNAME", "");
  vi.stubEnv("VITE_DEMO_LOGIN_PASSWORD", "");
  render(() => <LoginPage />);
  expect((screen.getByLabelText("auth.username") as HTMLInputElement).value).toBe("admin");
  expect((screen.getByLabelText("auth.password") as HTMLInputElement).value).toBe("admin123");
  expect(screen.queryByRole("button", { name: /auth.demoLogin/ })).toBeNull();
  vi.unstubAllEnvs();
});
