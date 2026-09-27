import { cleanup, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import PaymentsPage from "@/pages/payments-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getUserSearch, getPaymentBalanceByUserId, getPaymentPlans, getPaymentLedgerByUserId } = vi.hoisted(() => ({
  getUserSearch: vi.fn(),
  getPaymentBalanceByUserId: vi.fn(),
  getPaymentPlans: vi.fn(),
  getPaymentLedgerByUserId: vi.fn(),
}));
vi.mock("@tanstack/solid-router", () => ({
  Link: () => null,
  Navigate: () => null,
  useLocation: () => () => ({ pathname: "/management/payments", search: {} }),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "manager", role: "manager" }), loading: () => false, error: () => null }),
}));
vi.mock("@/api/users", () => ({ getUserSearch, getUserProfile: vi.fn() }));
vi.mock("@/api/payments", () => ({
  getPaymentBalanceByUserId,
  getPaymentPlans,
  getPaymentLedgerByUserId,
  getPaymentStatementByUserId: vi.fn(),
  getPlanAssignments: vi.fn(),
  deletePaymentPlanById: vi.fn(),
  patchPaymentPlanById: vi.fn(),
  postPaymentCredit: vi.fn(),
  postPaymentPlan: vi.fn(),
  postPaymentRefund: vi.fn(),
  postPaymentReversal: vi.fn(),
  postPlanAssignment: vi.fn(),
}));

let observed: Element[] = [];
let observers: { callback: IntersectionObserverCallback; elements: Element[] }[] = [];
const originalObserver = globalThis.IntersectionObserver;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  observed = [];
  observers = [];
  globalThis.IntersectionObserver = originalObserver;
});

test("student rows paint before balances; only visible rows request a balance", async () => {
  globalThis.IntersectionObserver = class {
    private entry: { callback: IntersectionObserverCallback; elements: Element[] };
    constructor(cb: IntersectionObserverCallback) {
      this.entry = { callback: cb, elements: [] };
      observers.push(this.entry);
    }
    observe(element: Element) { observed.push(element); this.entry.elements.push(element); }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  getUserSearch.mockResolvedValue({ items: [
    { id: "a", username: "ada", display_name: "Ada" },
    { id: "b", username: "bora", display_name: "Bora" },
  ], total: 2 });
  getPaymentPlans.mockResolvedValue({ items: [] });
  getPaymentBalanceByUserId.mockResolvedValue({ balance_minor: -1000 });

  const view = render(() => <PreferencesProvider><PaymentsPage /></PreferencesProvider>);
  expect(await screen.findByText("Ada")).toBeTruthy();
  expect(screen.getByText("Bora")).toBeTruthy();
  expect(getPaymentBalanceByUserId).not.toHaveBeenCalled();
  expect(view.container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  expect(getPaymentLedgerByUserId).not.toHaveBeenCalled();
  const first = observed.find((element) => (element as HTMLElement).dataset.studentId === "a");
  expect(first).toBeTruthy();
  const observer = observers.find((entry) => entry.elements.includes(first!));
  expect(observer).toBeTruthy();

  observer!.callback([{ target: first!, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  await waitFor(() => expect(getPaymentBalanceByUserId).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.container.textContent).toContain("In debt"));
  expect(getPaymentBalanceByUserId).toHaveBeenCalledWith("a");
  observer!.callback([{ target: first!, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  expect(getPaymentBalanceByUserId).toHaveBeenCalledTimes(1);
});
