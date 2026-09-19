import {
  type Accessor,
  type ParentProps,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getMe } from "@/api/users";
import { postLogout } from "@/api/auth";
import type { User } from "@/api/client";
import { ApiError } from "@/api/client";
import { devAutoLogin, stopDevAutoLogin } from "@/lib/dev-auto-login";
import { usePreferences } from "@/stores/preferences-context";

type AuthContextValue = {
  user: Accessor<User | null | undefined>;
  loading: Accessor<boolean>;
  /** Non-401 bootstrap failure. 401 is "logged out", not an error. */
  error: Accessor<unknown>;
  refresh: () => Promise<User | null | undefined>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>();

/** Retry-After (seconds) for a transient 429/503, else null. */
function retryAfterFor(err: unknown): number | null {
  if (
    err instanceof ApiError &&
    (err.status === 429 || err.status === 503) &&
    err.retryAfter != null
  ) {
    return Math.min(Math.max(err.retryAfter, 0), 60);
  }
  return null;
}

export function AuthProvider(props: ParentProps) {
  const prefs = usePreferences();
  const [override, setOverride] = createSignal<User | null | undefined>(undefined);
  const [error, setError] = createSignal<unknown>(null);
  // The fetcher swallows every failure into `error` state and resolves
  // IMMEDIATELY: it must never stay `loading` (that suspends the whole shell
  // and blanks the page) nor re-throw during render. Transient 429/503 waits
  // happen off the resource, in the background timer below.
  const [me, { refetch }] = createResource(async () => {
    setError(null);
    try {
      return await getMe();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return await devAutoLogin();
      setError(err);
      return null;
    }
  });

  const user: Accessor<User | null | undefined> = () => {
    const o = override();
    if (o !== undefined) return o;
    return me();
  };

  createEffect(() => {
    const u = user();
    if (u) prefs.hydratePreferences(u);
  });

  const refresh = async () => {
    setOverride(undefined);
    const result = await refetch();
    return result as User | null | undefined;
  };

  // Auto-heal a rate-limited bootstrap without blocking render: once `error`
  // holds a 429/503 with a Retry-After, schedule one background refresh. The
  // user is already looking at the error Alert while this waits; on success
  // the app paints. Re-running the effect (new attempt) clears the old timer.
  createEffect(() => {
    const wait = retryAfterFor(error());
    if (wait == null) return;
    const timer = setTimeout(() => void refresh(), wait * 1000);
    onCleanup(() => clearTimeout(timer));
  });

  const logout = async () => {
    stopDevAutoLogin();
    try {
      await postLogout();
    } finally {
      setOverride(null);
    }
  };

  const value: AuthContextValue = {
    user,
    loading: () => me.loading && override() === undefined,
    error: () => (override() === undefined ? error() : null),
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
