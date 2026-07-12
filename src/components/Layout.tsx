// App shell: sidebar with navigation, user chip, and logout. Collapses into a
// top bar on narrow screens (pure CSS), where the nav moves into a fixed
// bottom tab bar within thumb reach. Rendered only for authenticated routes.

import { A, useNavigate } from "@solidjs/router";
import { Show, type ParentProps } from "solid-js";
import { useAuth } from "../lib/auth";
import { lang, setLang, t } from "../lib/i18n";
import {
  IconBook,
  IconCalendar,
  IconChart,
  IconClipboard,
  IconHome,
  IconLogout,
  IconNote,
  IconPlane,
  IconUsers,
} from "./Icons";

export function Layout(props: ParentProps) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div class="shell">
      <header class="sidebar">
        <A href="/" class="brand">
          <span class="brand-mark">
            <IconPlane />
          </span>
          <span>Hezarfen</span>
        </A>
        <nav>
          <A href="/" end>
            <IconHome /> {t("navHome")}
          </A>
          <A href="/notes">
            <IconNote /> {t("navNotes")}
          </A>
          <A href="/events">
            <IconCalendar /> {t("navEvents")}
          </A>
          <A href="/courses">
            <IconBook /> {t("navCourses")}
          </A>
          <A href="/exams">
            <IconClipboard /> {t("navExams")}
          </A>
          <A href="/marks">
            <IconChart /> {t("navMarks")}
          </A>
          <Show when={can("admin")}>
            <A href="/users">
              <IconUsers /> {t("navUsers")}
            </A>
          </Show>
        </nav>
        <div class="sidebar-end">
          <Show when={user()}>
            {(current) => (
              <A href="/profile" class="user-chip" title={t("profileLink")}>
                <span class="avatar">
                  {(current().name ?? current().username).slice(0, 1)}
                </span>
                <span class="user-meta">
                  <strong>{current().name ?? current().username}</strong>
                  <span>{t("roleWord")(current().role)}</span>
                </span>
              </A>
            )}
          </Show>
          <button
            class="ghost lang-switch"
            onClick={() => setLang(lang() === "tr" ? "en" : "tr")}
          >
            {t("otherLanguage")}
          </button>
          <button class="ghost logout" onClick={onLogout}>
            <IconLogout /> <span>{t("logout")}</span>
          </button>
        </div>
      </header>
      <main>{props.children}</main>

      {/* Thumb-reach duplicate of the nav on small screens (CSS-hidden on
          desktop); the sidebar collapses into a top bar with just the brand,
          profile chip, and logout. */}
      <nav class="tabbar">
        <A href="/" end>
          <IconHome /> {t("navHome")}
        </A>
        <A href="/notes">
          <IconNote /> {t("navNotes")}
        </A>
        <A href="/events">
          <IconCalendar /> {t("navEvents")}
        </A>
        <A href="/courses">
          <IconBook /> {t("navCourses")}
        </A>
        <A href="/exams">
          <IconClipboard /> {t("navExams")}
        </A>
        <A href="/marks">
          <IconChart /> {t("navMarks")}
        </A>
        <Show when={can("admin")}>
          <A href="/users">
            <IconUsers /> {t("navUsers")}
          </A>
        </Show>
      </nav>
    </div>
  );
}
