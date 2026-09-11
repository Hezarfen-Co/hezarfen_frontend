import {
  type Accessor,
  type ParentProps,
  createContext,
  createMemo,
  createResource,
  useContext,
} from "solid-js";
import { getModules } from "@/api/modules";
import { useAuth } from "@/stores/auth-context";

type ModulesContextValue = {
  /**
   * The school's switched-on modules, sorted by name. Null while logged out,
   * still loading, or failed — every consumer treats null as "unknown" and
   * shows everything (fail open), so a modules outage never blanks the shell.
   */
  enabled: Accessor<string[] | null>;
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

  const value: ModulesContextValue = {
    enabled: () => modules(),
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
