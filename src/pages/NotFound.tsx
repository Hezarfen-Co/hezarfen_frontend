import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <main class="auth-page">
      <div class="card stack" style={{ "text-align": "center", padding: "2.5rem 3rem" }}>
        <h1 style={{ "font-size": "2.5rem" }}>404</h1>
        <p class="muted">This page flew away.</p>
        <A href="/">Back home</A>
      </div>
    </main>
  );
}
