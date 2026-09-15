import { type Accessor, type ParentProps, createContext, useContext } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getBuilderMe, postBuilderLogout } from "@/api/builder";
import { ApiError, type Builder } from "@/api/client";

type BuilderContextValue = {
  /** undefined while resolving, null when this browser holds no builder session. */
  builder: Accessor<Builder | null | undefined>;
  loading: Accessor<boolean>;
  error: Accessor<unknown>;
  refresh: () => void;
  logout: () => Promise<void>;
};

const BuilderContext = createContext<BuilderContextValue>();

/**
 * The deployment operator's session. Separate from AuthProvider on purpose: a
 * builder cookie is 401 on every school route and a school cookie is 401 here,
 * so the two never describe the same browser at once.
 */
export function BuilderProvider(props: ParentProps) {
  let failure: unknown = null;
  const [me, { refetch, mutate }] = createResource(async () => {
    failure = null;
    try {
      return await getBuilderMe();
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) failure = err;
      return null;
    }
  });

  const value: BuilderContextValue = {
    builder: () => me(),
    loading: () => me.loading,
    error: () => (me() === null ? failure : null),
    refresh: () => void refetch(),
    logout: async () => {
      try {
        await postBuilderLogout();
      } finally {
        mutate(null);
      }
    },
  };

  return <BuilderContext.Provider value={value}>{props.children}</BuilderContext.Provider>;
}

export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used within BuilderProvider");
  return ctx;
}
