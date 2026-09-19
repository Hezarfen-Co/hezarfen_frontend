/**
 * Demo sign-in shown on the login page: when `VITE_DEMO_LOGIN_USERNAME` and
 * `VITE_DEMO_LOGIN_PASSWORD` are set at build time, the form opens filled
 * with them and offers a one-click "sign in with the demo account". Unlike
 * the dev auto sign-in this is meant for a deployed demo, so the values end
 * up in the bundle — only ever set them for a demo school.
 */
export function demoCredentials(): { username: string; password: string } | null {
  const username = import.meta.env.VITE_DEMO_LOGIN_USERNAME;
  const password = import.meta.env.VITE_DEMO_LOGIN_PASSWORD;
  return username && password ? { username, password } : null;
}
