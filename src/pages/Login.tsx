// Login / register, one form with a mode switch. On success the auth resource
// is already mutated, so navigation lands on a fully hydrated app.

import { Navigate, useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { ErrorLine } from "../components/Feedback";
import { IconPlane } from "../components/Icons";
import { createAction } from "../lib/action";
import { useAuth } from "../lib/auth";
import { LIMITS } from "../lib/types";

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = createSignal<"login" | "register">("login");

  const submit = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const credentials = {
      username: String(data.get("username")),
      password: String(data.get("password")),
    };
    await (mode() === "login" ? login(credentials) : register(credentials));
    navigate("/", { replace: true });
  });

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    submit.clearError();
  };

  return (
    <Show when={!user()} fallback={<Navigate href="/" />}>
      <main class="auth-page">
        <form
          class="card auth-card"
          onSubmit={(e) => {
            e.preventDefault();
            void submit.run(e.currentTarget);
          }}
        >
          <header class="auth-head">
            <span class="brand-mark">
              <IconPlane />
            </span>
            <h1>Hezarfen</h1>
            <p>
              {mode() === "login"
                ? "Welcome back — log in to continue."
                : "Create an account to get started."}
            </p>
          </header>
          <label>
            Username
            <input
              name="username"
              required
              minLength={LIMITS.username.min}
              maxLength={LIMITS.username.max}
              autocomplete="username"
              autofocus
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={LIMITS.password.min}
              maxLength={LIMITS.password.max}
              autocomplete={mode() === "login" ? "current-password" : "new-password"}
            />
          </label>
          <ErrorLine error={submit.error()} />
          <button type="submit" disabled={submit.pending()}>
            {mode() === "login" ? "Log in" : "Create account"}
          </button>
          <button type="button" class="ghost" onClick={switchMode}>
            {mode() === "login" ? "New here? Register" : "Have an account? Log in"}
          </button>
        </form>
      </main>
    </Show>
  );
}
