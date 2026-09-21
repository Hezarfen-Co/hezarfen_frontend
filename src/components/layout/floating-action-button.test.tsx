import { fireEvent, render, screen } from "@solidjs/testing-library";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { IconBell } from "@/components/ui/icons";
import { PreferencesProvider } from "@/stores/preferences-context";

// A 400×700 layer: the hide target's top-left is (172, 632), the resting
// bottom-right button's is (332, 632).
const W = 400;
const H = 700;

function renderFab(onSelect = vi.fn()) {
  render(() => (
    <PreferencesProvider>
      <FloatingActionButton
        actions={[{ id: "notifications", label: "Bildirimler", Icon: IconBell, badge: 2, onSelect }]}
        badge={3}
        hidden={false}
      />
    </PreferencesProvider>
  ));
  return { fab: screen.getByRole("button", { name: /hızlı işlemler|quick actions/i, expanded: false }), onSelect };
}

function drag(el: HTMLElement, from: [number, number], to: [number, number]) {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: from[0], clientY: from[1], button: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: (from[0] + to[0]) / 2, clientY: (from[1] + to[1]) / 2 });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: to[0], clientY: to[1] });
  fireEvent.click(el);
}

describe("FloatingActionButton", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: W, height: H, top: 0, left: 0, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    HTMLElement.prototype.setPointerCapture = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("fans its actions out on a tap and runs the one picked", () => {
    const { fab, onSelect } = renderFab();
    fireEvent.pointerDown(fab, { pointerId: 1, clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerUp(fab, { pointerId: 1, clientX: 12, clientY: 11 });
    fireEvent.click(fab);
    expect(fab.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Bildirimler" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(fab.getAttribute("aria-expanded")).toBe("false");
  });

  it("remembers where it was dropped, and a drag is not a tap", () => {
    const { fab } = renderFab();
    drag(fab, [360, 660], [60, 300]);
    expect(fab.getAttribute("aria-expanded")).toBe("false");
    const saved = JSON.parse(localStorage.getItem("hezarfen.floatingButton")!);
    expect(saved.parked).toBe(false);
    expect(saved.x).toBeLessThan(0.1);
    expect(saved.y).toBeGreaterThan(0.3);
    expect(saved.y).toBeLessThan(0.5);
  });

  it("parks on the edge when dropped on the hide target and comes back with one tap", () => {
    const { fab } = renderFab();
    // 332 → 172 horizontally lands the button on the hide target.
    drag(fab, [360, 660], [200, 660]);
    expect(screen.queryByRole("button", { name: /hızlı işlemler|quick actions/i, expanded: false })).toBeNull();
    const saved = JSON.parse(localStorage.getItem("hezarfen.floatingButton")!);
    // Parked, but still remembering the spot it was dragged from.
    expect(saved).toEqual({ x: 1, y: 1, parked: true });

    fireEvent.click(screen.getByRole("button", { name: /göster|show quick actions/i }));
    expect(screen.getByRole("button", { name: /hızlı işlemler|quick actions/i, expanded: false })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("hezarfen.floatingButton")!).parked).toBe(false);
  });
});
