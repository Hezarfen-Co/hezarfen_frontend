/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only auto sign-in (see src/lib/dev-auto-login.ts); set in .env.local, never committed. */
  readonly VITE_DEV_AUTOLOGIN_USERNAME?: string;
  readonly VITE_DEV_AUTOLOGIN_PASSWORD?: string;
  readonly VITE_DEV_AUTOLOGIN_SCHOOL?: string;
  /** Demo account prefilled on the login page (see src/lib/demo-login.ts); bundled when set. */
  readonly VITE_DEMO_LOGIN_USERNAME?: string;
  readonly VITE_DEMO_LOGIN_PASSWORD?: string;
}
