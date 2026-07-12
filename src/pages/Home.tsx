// Landing dashboard: greeting, quick stats, upcoming events, and the caller's
// courses. Every tile links into the section it summarizes.

import { A } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import { Empty, Loading } from "../components/Feedback";
import { IconBook, IconCalendar, IconChart, IconNote } from "../components/Icons";
import { courses, events, marks, notes } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatWindow } from "../lib/format";
import { locale, t } from "../lib/i18n";

export default function Home() {
  const { user } = useAuth();
  const [eventList] = createResource(events.list);
  const [myCourses] = createResource(courses.mine);
  const [report] = createResource(marks.mine);
  const [noteList] = createResource(notes.list);

  // Ongoing or future events, soonest first; unscheduled ones sort last.
  const upcoming = () => {
    const now = Date.now();
    return (eventList() ?? [])
      .filter((e) => (e.ends_at ?? e.starts_at ?? now) >= now)
      .sort((a, b) => (a.starts_at ?? Infinity) - (b.starts_at ?? Infinity));
  };

  const greeting = () =>
    t("greeting")(user()?.name ?? user()?.username ?? "", new Date().getHours());
  const today = () =>
    new Intl.DateTimeFormat(locale(), { dateStyle: "full" }).format(new Date());

  const average = () => {
    const value = report()?.overall_average;
    return value == null ? null : Math.round(value * 10) / 10;
  };

  return (
    <section class="stack-lg">
      <header class="page-head">
        <div>
          <h1>{greeting()}</h1>
          <p class="sub">{today()}</p>
        </div>
      </header>

      <div class="stats">
        <A href="/notes" class="card link-card stat">
          <span class="stat-label">
            <IconNote /> {t("statNotes")}
          </span>
          <span class="stat-value">{noteList()?.length ?? "—"}</span>
        </A>
        <A href="/events" class="card link-card stat">
          <span class="stat-label">
            <IconCalendar /> {t("statUpcoming")}
          </span>
          <span class="stat-value">{eventList() ? upcoming().length : "—"}</span>
        </A>
        <A href="/courses" class="card link-card stat">
          <span class="stat-label">
            <IconBook /> {t("statMyCourses")}
          </span>
          <span class="stat-value">{myCourses()?.length ?? "—"}</span>
        </A>
        <A href="/marks" class="card link-card stat">
          <span class="stat-label">
            <IconChart /> {t("statAverage")}
          </span>
          <span class="stat-value">
            {average() ?? "—"}
            <Show when={average() !== null}>
              <small> / 100</small>
            </Show>
          </span>
        </A>
      </div>

      <div class="cols">
        <section class="stack">
          <div class="section-head">
            <h2>{t("upcomingEvents")}</h2>
            <A href="/events">{t("viewAll")}</A>
          </div>
          <Show when={!eventList.loading} fallback={<Loading />}>
            <Show when={upcoming().length} fallback={<Empty>{t("nothingScheduled")}</Empty>}>
              <For each={upcoming().slice(0, 4)}>
                {(event) => (
                  <A href={`/events/${event.id}`} class="card link-card stack">
                    <h3>{event.title}</h3>
                    <p class="meta">{formatWindow(event.starts_at, event.ends_at)}</p>
                  </A>
                )}
              </For>
            </Show>
          </Show>
        </section>

        <section class="stack">
          <div class="section-head">
            <h2>{t("myCourses")}</h2>
            <A href="/courses">{t("viewAll")}</A>
          </div>
          <Show when={!myCourses.loading} fallback={<Loading />}>
            <Show
              when={myCourses()?.length}
              fallback={<Empty>{t("notEnrolledYet")}</Empty>}
            >
              <For each={myCourses()?.slice(0, 4)}>
                {(course) => (
                  <A href={`/courses/${course.id}`} class="card link-card stack">
                    <h3>{course.title}</h3>
                    <Show when={course.description}>
                      <p class="muted clamp">{course.description}</p>
                    </Show>
                  </A>
                )}
              </For>
            </Show>
          </Show>
        </section>
      </div>
    </section>
  );
}
