// Session state for the whole app. `/auth/me` is fetched exactly once at
// startup; login/register/logout mutate the resource in place from the
// server's response, so every consumer updates instantly with no refetch.

import {
  createContext,
  createResource,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";
import { ApiError, auth, type Credentials } from "./api";
import { atLeast, type Role, type User } from "./types";

interface AuthValue {
  /** `undefined` while the initial /auth/me is in flight, `null` when logged out. */
  user: Accessor<User | null | undefined>;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  /** Replace the session user with a fresh server response (e.g. a profile save). */
  update: (user: User) => void;
  /** True when the current user's role is `required` or higher. */
  can: (required: Role) => boolean;
}

const AuthContext = createContext<AuthValue>();

async function fetchMe(): Promise<User | null> {
  try {
    return await auth.me();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function AuthProvider(props: ParentProps) {
  const [me, { mutate }] = createResource(fetchMe);

  const value: AuthValue = {
    user: () => (me.state === "ready" ? me() : me.latest ?? undefined),
    login: async (credentials) => {
      mutate(await auth.login(credentials));
    },
    register: async (credentials) => {
      // Register does not set a session cookie; log in right after.
      await auth.register(credentials);
      mutate(await auth.login(credentials));
    },
    logout: async () => {
      await auth.logout();
      mutate(null);
    },
    update: (user) => {
      mutate(user);
    },
    can: (required) => {
      const current = me.latest;
      return current != null && atLeast(current.role, required);
    },
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
