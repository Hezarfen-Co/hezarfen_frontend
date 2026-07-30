import { createSignal, onMount } from "solid-js";

export type TableDensity = "compact" | "normal" | "comfortable";

/** TanStack `columnSizing` shape: column id → width (px). */
export type ColumnSizing = Record<string, number>;
/** TanStack `columnVisibility` shape: column id → visible. Absent = visible. */
export type ColumnVisibility = Record<string, boolean>;

export type TablePreferences = {
  sizing: ColumnSizing;
  visibility: ColumnVisibility;
  density: TableDensity;
};

const STORAGE_PREFIX = "hezarfen.table.";

export const defaultTablePreferences: TablePreferences = {
  sizing: {},
  visibility: {},
  density: "compact",
};

export function readTablePreferences(storageKey: string): TablePreferences {
  if (typeof window === "undefined") return defaultTablePreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) return defaultTablePreferences;
    const parsed = JSON.parse(raw) as Partial<TablePreferences>;
    return {
      sizing: typeof parsed.sizing === "object" && parsed.sizing ? parsed.sizing : {},
      visibility: typeof parsed.visibility === "object" && parsed.visibility ? parsed.visibility : {},
      density:
        parsed.density === "compact" ||
        parsed.density === "comfortable" ||
        parsed.density === "normal"
          ? parsed.density
          : defaultTablePreferences.density,
    };
  } catch {
    return defaultTablePreferences;
  }
}

function writePreferences(storageKey: string | undefined, preferences: TablePreferences) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable (private mode, quota); preferences stay in memory only.
  }
}

export type TablePreferencesController = ReturnType<typeof createTablePreferences>;

/**
 * Column widths, column visibility and row density persisted per table.
 * When `storageKey` is omitted the preferences stay in memory only (ephemeral).
 * Preferences load in `onMount` so the first render matches the SSR-free default.
 */
export function createTablePreferences(storageKey?: string) {
  const [preferences, setPreferences] = createSignal<TablePreferences>(defaultTablePreferences);

  onMount(() => {
    if (storageKey) setPreferences(readTablePreferences(storageKey));
  });

  const patch = (next: Partial<TablePreferences>) => {
    setPreferences((current) => {
      const merged = { ...current, ...next };
      writePreferences(storageKey, merged);
      return merged;
    });
  };

  return {
    preferences,
    setDensity: (density: TableDensity) => patch({ density }),
    setSizing: (sizing: ColumnSizing) => patch({ sizing }),
    resetSizing: () => patch({ sizing: {} }),
    setVisibility: (visibility: ColumnVisibility) => patch({ visibility }),
  };
}
