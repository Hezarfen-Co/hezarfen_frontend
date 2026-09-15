import {
  type Accessor,
  type ParentProps,
  createContext,
  createMemo,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { createResource } from "@/lib/create-resource";
import { onModuleDisabled } from "@/api/client";
import { getModules } from "@/api/modules";
import { useAuth } from "@/stores/auth-context";

type ModulesContextValue = {
  /**
   * The school's switched-on modules, sorted by name. Null while logged out,
   * still loading, or failed — every consumer treats null as "unknown" and
   * shows everything (fail open), so a modules outage never blanks the shell.
   */
  enabled: Accessor<string[] | null>;
  /**
   * True until the first lookup for this account settles. Readers that would
   * otherwise fire at a possibly-off module on first paint wait for it; after
   * that a failed lookup still fails open.
   */
  loading: Accessor<boolean>;
  /** Fail-open membership test over `enabled`. */
  isEnabled: (module: string) => boolean;
  refresh: () => void;
};

const ModulesContext = createContext<ModulesContextValue>();

export function ModulesProvider(props: ParentProps) {
  const auth = useAuth();
  // Keyed on the account id: switching account refetches. While logged out
  // the source is null and the resource keeps its seeded null — the shell
  // shows no nav without a role anyway, so nothing stale can render.
  const userId = createMemo(() => auth.user()?.id ?? null);
  const [modules, { refetch }] = createResource(
    userId,
    async (id) => {
      if (id === null) return null;
      try {
        return (await getModules()).enabled;
      } catch {
        return null;
      }
    },
    { initialValue: null },
  );

  // The enabled set changes under a live session when a builder flips a
  // module. Two cues bring it up to date without a reload: a route answering
  // `403 {module}` (switched off), and the tab coming back into view after a
  // while (switched on, or off where nothing was asked of it yet).
  const REVISIT_AFTER_MS = 60_000;
  let lastFetch = Date.now();
  const refreshNow = () => {
    if (userId() === null || modules.loading) return;
    lastFetch = Date.now();
    void refetch();
  };
  onMount(() => {
    const stop = onModuleDisabled((module) => {
      if (modules.latest?.includes(module) !== false) refreshNow();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch > REVISIT_AFTER_MS) refreshNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    onCleanup(() => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    });
  });

  const value: ModulesContextValue = {
    enabled: () => modules(),
    loading: () => userId() !== null && modules.loading && modules.latest === null,
    isEnabled: (module: string) => {
      const enabled = modules();
      return enabled === null || enabled.includes(module);
    },
    refresh: () => void refetch(),
  };

  return <ModulesContext.Provider value={value}>{props.children}</ModulesContext.Provider>;
}

export function useModules(): ModulesContextValue {
  const context = useContext(ModulesContext);
  if (!context) throw new Error("useModules must be used inside ModulesProvider");
  return context;
}
