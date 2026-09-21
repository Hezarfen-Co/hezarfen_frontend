/**
 * Where the phone shell's floating action button rests. Kept per device in
 * localStorage: a spot a thumb picked on one phone means nothing on another.
 *
 * The position is stored as a share (0–1) of the travel the button has inside
 * its layer, not in pixels, so it survives a rotation or a resized window.
 */
export interface FloatingButtonState {
  x: number;
  y: number;
  /** Put away onto the screen edge by dropping it on the hide target. */
  parked: boolean;
}

const STORAGE_KEY = "hezarfen.floatingButton";

/** Bottom-right, above the tab bar. */
export const DEFAULT_FLOATING_BUTTON: FloatingButtonState = { x: 1, y: 1, parked: false };

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const share = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? clamp01(value) : fallback;

export function readFloatingButton(): FloatingButtonState {
  if (!canUseStorage()) return { ...DEFAULT_FLOATING_BUTTON };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FLOATING_BUTTON };
    const value = JSON.parse(raw) as Partial<FloatingButtonState> | null;
    return {
      x: share(value?.x, DEFAULT_FLOATING_BUTTON.x),
      y: share(value?.y, DEFAULT_FLOATING_BUTTON.y),
      parked: value?.parked === true,
    };
  } catch {
    return { ...DEFAULT_FLOATING_BUTTON };
  }
}

export function writeFloatingButton(state: FloatingButtonState): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore — a private window or a full quota just forgets the spot
  }
}

/**
 * Offsets of the radial menu items from the button's centre.
 *
 * The fan opens towards the middle of the screen, so wherever the button was
 * dragged its items land on screen: a corner opens a quarter circle along its
 * diagonal, an edge a wider fan away from that edge, and the middle a fan
 * upwards. `cx`/`cy` are the button centre as a share of the layer; measuring
 * in that unit square keeps a corner's fan on the diagonal whatever the
 * phone's aspect ratio.
 */
export function radialOffsets(count: number, cx: number, cy: number, radius: number): { dx: number; dy: number }[] {
  if (count <= 0) return [];
  const vx = 0.5 - cx;
  const vy = 0.5 - cy;
  const heading = Math.hypot(vx, vy) < 0.15 ? -Math.PI / 2 : Math.atan2(vy, vx);
  const corner = Math.abs(vx) > 0.25 && Math.abs(vy) > 0.25;
  const spread = count === 1 ? 0 : corner ? Math.PI / 2 : (Math.PI * 5) / 6;
  return Array.from({ length: count }, (_, i) => {
    const angle = heading + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread);
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  });
}
