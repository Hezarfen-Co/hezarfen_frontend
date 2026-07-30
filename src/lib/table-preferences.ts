import { createSignal, onMount } from "solid-js";

/** TanStack `columnVisibility` shape: column id → visible. Absent = visible. */
export type ColumnVisibility = Record<string, boolean>;

export type TablePreferences = {
  visibility: ColumnVisibility;
};

const STORAGE_PREFIX = "hezarfen.table.";

export const defaultTablePreferences: TablePreferences = {
  visibility: {},
};

export function readTablePreferences(storageKey: string): TablePreferences {
  if (typeof window === "undefined") return defaultTablePreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) return defaultTablePreferences;
    const parsed = JSON.parse(raw) as Partial<TablePreferences>;
    return {
      visibility: typeof parsed.visibility === "object" && parsed.visibility ? parsed.visibility : {},
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
 * Column visibility persisted per table.
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
    setVisibility: (visibility: ColumnVisibility) => patch({ visibility }),
  };
}
