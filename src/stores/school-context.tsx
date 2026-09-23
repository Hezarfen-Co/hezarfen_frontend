import { type Accessor, type ParentProps, createContext, createMemo, useContext } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getSchool } from "@/api/school";
import { useAuth } from "@/stores/auth-context";

type SchoolContextValue = {
  /** The session school's display name; null while logged out, loading, or failed. */
  name: Accessor<string | null>;
};

const SchoolContext = createContext<SchoolContextValue>();

export function SchoolProvider(props: ParentProps) {
  const auth = useAuth();
  // Keyed on the account id, so switching school (a new session) refetches.
  // Seeded with null so no reader ever suspends the shell on it.
  const userId = createMemo(() => auth.user()?.id ?? null);
  const [school] = createResource(
    userId,
    async (id) => {
      if (id === null) return null;
      try {
        return await getSchool();
      } catch {
        return null;
      }
    },
    { initialValue: null },
  );

  return <SchoolContext.Provider value={{ name: () => school()?.name ?? null }}>{props.children}</SchoolContext.Provider>;
}

const NO_SCHOOL: SchoolContextValue = { name: () => null };

/** Outside a provider (isolated component tests) there is simply no name to show. */
export function useSchool(): SchoolContextValue {
  return useContext(SchoolContext) ?? NO_SCHOOL;
}
