import {
  type Accessor,
  type ParentProps,
  createContext,
  createEffect,
  createResource,
  createSignal,
  useContext,
} from "solid-js";
import { getMe } from "@/api/users";
import { postLogout } from "@/api/auth";
import type { User } from "@/api/client";
import { ApiError } from "@/api/client";
import { usePreferences } from "@/stores/preferences-context";

type AuthContextValue = {
  user: Accessor<User | null | undefined>;
  loading: Accessor<boolean>;
  setUser: (user: User | null) => void;
  refresh: () => Promise<User | null | undefined>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: ParentProps) {
  const prefs = usePreferences();
  const [override, setOverride] = createSignal<User | null | undefined>(undefined);
  const [me, { refetch }] = createResource(async () => {
    try {
      return await getMe();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  });

  const user: Accessor<User | null | undefined> = () => {
    const o = override();
    if (o !== undefined) return o;
    return me();
  };

  const setUser = (u: User | null) => setOverride(u);

  createEffect(() => {
    const u = user();
    if (u) prefs.hydratePreferences(u);
  });

  const refresh = async () => {
    setOverride(undefined);
    const result = await refetch();
    return result as User | null | undefined;
  };

  const logout = async () => {
    try {
      await postLogout();
    } finally {
      setOverride(null);
    }
  };

  const value: AuthContextValue = {
    user,
    loading: () => me.loading && override() === undefined,
    setUser,
    refresh,
    logout,
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
