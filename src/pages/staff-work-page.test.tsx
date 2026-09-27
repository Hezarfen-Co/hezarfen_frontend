import { cleanup, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import StaffWorkPage from "@/pages/staff-work-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getUserSearch, getUserWorkLog } = vi.hoisted(() => ({
  getUserSearch: vi.fn(),
  getUserWorkLog: vi.fn(),
}));
vi.mock("@tanstack/solid-router", () => ({ Link: () => null, Navigate: () => null, useLocation: () => () => ({ pathname: "/management/staff-work" }) }));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "manager", role: "manager" }), loading: () => false, error: () => null }),
}));
vi.mock("@/api/users", () => ({ getUserSearch }));
vi.mock("@/api/work", () => ({ getUserWorkLog, patchWorkEntryById: vi.fn(), deleteWorkEntryById: vi.fn() }));

let observed: Element[] = [];
let callback: IntersectionObserverCallback;
const originalObserver = globalThis.IntersectionObserver;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  observed = [];
  globalThis.IntersectionObserver = originalObserver;
});

test("staff cards paint before work logs and fetch only visible cards once", async () => {
  globalThis.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) { callback = cb; }
    observe(element: Element) { observed.push(element); }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  getUserSearch.mockResolvedValue({ items: [
    { id: "a", username: "ada", display_name: "Ada" },
    { id: "b", username: "bora", display_name: "Bora" },
  ] });
  getUserWorkLog.mockResolvedValue({ items: [], total: 0 });

  const view = render(() => <PreferencesProvider><StaffWorkPage /></PreferencesProvider>);
  expect(await screen.findByText("Ada")).toBeTruthy();
  expect(screen.getByText("Bora")).toBeTruthy();
  expect(getUserWorkLog).not.toHaveBeenCalled();
  expect(view.container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  expect(observed).toHaveLength(2);

  callback([{ target: observed[0], isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  await waitFor(() => expect(getUserWorkLog).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByText("Ada").closest("button")?.textContent).toContain("No activity"));
  expect(getUserWorkLog).toHaveBeenCalledWith("a", { limit: 500 });
  callback([{ target: observed[0], isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  expect(getUserWorkLog).toHaveBeenCalledTimes(1);
});
