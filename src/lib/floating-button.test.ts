import {
  DEFAULT_FLOATING_BUTTON,
  radialOffsets,
  readFloatingButton,
  writeFloatingButton,
} from "@/lib/floating-button";

// The node project has no DOM storage; a Map-backed stand-in is enough here.
function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    clear: () => store.clear(),
  });
}

describe("floating button state", () => {
  beforeEach(stubStorage);
  afterEach(() => vi.unstubAllGlobals());

  it("starts bottom-right and unparked", () => {
    expect(readFloatingButton()).toEqual(DEFAULT_FLOATING_BUTTON);
  });

  it("round-trips a saved spot", () => {
    writeFloatingButton({ x: 0.2, y: 0.4, parked: true });
    expect(readFloatingButton()).toEqual({ x: 0.2, y: 0.4, parked: true });
  });

  it("clamps out-of-range shares and ignores junk", () => {
    localStorage.setItem("hezarfen.floatingButton", JSON.stringify({ x: 3, y: "top", parked: "yes" }));
    expect(readFloatingButton()).toEqual({ x: 1, y: 1, parked: false });
    localStorage.setItem("hezarfen.floatingButton", "{not json");
    expect(readFloatingButton()).toEqual(DEFAULT_FLOATING_BUTTON);
  });
});

describe("radialOffsets", () => {
  const R = 80;

  it("fans a bottom-right button up and to the left only", () => {
    const offsets = radialOffsets(3, 0.95, 0.95, R);
    for (const { dx, dy } of offsets) {
      expect(dx).toBeLessThanOrEqual(1e-9);
      expect(dy).toBeLessThanOrEqual(1e-9);
    }
    // Quarter circle: the ends sit straight left and straight up.
    expect(offsets[0].dx).toBeCloseTo(-R);
    expect(offsets[2].dy).toBeCloseTo(-R);
  });

  it("fans a top-left button down and to the right only", () => {
    for (const { dx, dy } of radialOffsets(3, 0.05, 0.05, R)) {
      expect(dx).toBeGreaterThanOrEqual(-1e-9);
      expect(dy).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("fans away from a side edge", () => {
    for (const { dx } of radialOffsets(3, 0.02, 0.5, R)) expect(dx).toBeGreaterThan(0);
  });

  it("opens upwards from the middle of the screen", () => {
    const [only] = radialOffsets(1, 0.5, 0.5, R);
    expect(only.dx).toBeCloseTo(0);
    expect(only.dy).toBeCloseTo(-R);
  });

  it("keeps every item at the radius", () => {
    for (const { dx, dy } of radialOffsets(4, 0.3, 0.8, R)) expect(Math.hypot(dx, dy)).toBeCloseTo(R);
    expect(radialOffsets(0, 0.5, 0.5, R)).toEqual([]);
  });
});
