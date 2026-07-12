import { A } from "@solidjs/router";
import { t } from "../lib/i18n";

export default function NotFound() {
  return (
    <main class="auth-page">
      <div class="card stack" style={{ "text-align": "center", padding: "2.5rem 3rem" }}>
        <h1 style={{ "font-size": "2.5rem" }}>404</h1>
        <p class="muted">{t("pageFlewAway")}</p>
        <A href="/">{t("backHome")}</A>
      </div>
    </main>
  );
}
