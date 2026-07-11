// App shell: sidebar with navigation, user chip, and logout. Collapses into a
// top bar on narrow screens (pure CSS). Rendered only for authenticated routes.

import { A, useNavigate } from "@solidjs/router";
import { Show, type ParentProps } from "solid-js";
import { useAuth } from "../lib/auth";
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
            <IconHome /> Home
          </A>
          <A href="/notes">
            <IconNote /> Notes
          </A>
          <A href="/events">
            <IconCalendar /> Events
          </A>
          <A href="/courses">
            <IconBook /> Courses
          </A>
          <A href="/exams">
            <IconClipboard /> Exams
          </A>
          <A href="/marks">
            <IconChart /> Marks
          </A>
          <Show when={can("admin")}>
            <A href="/users">
              <IconUsers /> Users
            </A>
          </Show>
        </nav>
        <div class="sidebar-end">
          <Show when={user()}>
            {(current) => (
              <A href="/profile" class="user-chip" title="Profile">
                <span class="avatar">
                  {(current().name ?? current().username).slice(0, 1)}
                </span>
                <span class="user-meta">
                  <strong>{current().name ?? current().username}</strong>
                  <span>{current().role}</span>
                </span>
              </A>
            )}
          </Show>
          <button class="ghost icon-btn" onClick={onLogout} title="Log out">
            <IconLogout />
          </button>
        </div>
      </header>
      <main>{props.children}</main>
    </div>
  );
}
