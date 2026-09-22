import { postLogin, postSelectSchool } from "@/api/auth";
import type { User } from "@/api/client";

const SKIP_KEY = "hezarfen:dev-auto-login-off";

/**
 * Development-only sign-in with credentials from `.env.local`
 * (`VITE_DEV_AUTOLOGIN_USERNAME`, `VITE_DEV_AUTOLOGIN_PASSWORD`, optional
 * `VITE_DEV_AUTOLOGIN_SCHOOL`, a school uuid). `import.meta.env.DEV` is a build-time false in
 * `vite build`, so the whole body is dropped from production bundles.
 * An explicit logout turns it off for the rest of the tab.
 */
export async function devAutoLogin(): Promise<User | null> {
  if (!import.meta.env.DEV) return null;
  const username = import.meta.env.VITE_DEV_AUTOLOGIN_USERNAME;
  const password = import.meta.env.VITE_DEV_AUTOLOGIN_PASSWORD;
  if (!username || !password || sessionStorage.getItem(SKIP_KEY)) return null;
  try {
    const result = await postLogin({ username, password });
    if (!("schools" in result)) return result;
    const school = import.meta.env.VITE_DEV_AUTOLOGIN_SCHOOL || result.schools[0]?.id;
    return school ? await postSelectSchool({ school }) : null;
  } catch (err) {
    console.warn("Dev auto-login failed:", err);
    return null;
  }
}

/** Called on logout so the next /auth/me 401 shows the login page. */
export function stopDevAutoLogin(): void {
  if (import.meta.env.DEV) sessionStorage.setItem(SKIP_KEY, "1");
}
