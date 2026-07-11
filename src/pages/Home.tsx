// Landing dashboard: greeting, quick stats, upcoming events, and the caller's
// courses. Every tile links into the section it summarizes.

import { A } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import { Empty, Loading } from "../components/Feedback";
import { IconBook, IconCalendar, IconChart, IconNote } from "../components/Icons";
import { courses, events, marks, notes } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatWindow } from "../lib/format";

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

  const greeting = () => {
    const hour = new Date().getHours();
    const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    return `Good ${part}, ${user()?.name ?? user()?.username}`;
  };
  const today = new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(
    new Date(),
  );

  const average = () => {
    const value = report()?.overall_average;
    return value == null ? null : Math.round(value * 10) / 10;
  };

  return (
    <section class="stack-lg">
      <header class="page-head">
        <div>
          <h1>{greeting()}</h1>
          <p class="sub">{today}</p>
        </div>
      </header>

      <div class="stats">
        <A href="/notes" class="card link-card stat">
          <span class="stat-label">
            <IconNote /> Notes
          </span>
          <span class="stat-value">{noteList()?.length ?? "—"}</span>
        </A>
        <A href="/events" class="card link-card stat">
          <span class="stat-label">
            <IconCalendar /> Upcoming events
          </span>
          <span class="stat-value">{eventList() ? upcoming().length : "—"}</span>
        </A>
        <A href="/courses" class="card link-card stat">
          <span class="stat-label">
            <IconBook /> My courses
          </span>
          <span class="stat-value">{myCourses()?.length ?? "—"}</span>
        </A>
        <A href="/marks" class="card link-card stat">
          <span class="stat-label">
            <IconChart /> Average
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
            <h2>Upcoming events</h2>
            <A href="/events">View all</A>
          </div>
          <Show when={!eventList.loading} fallback={<Loading />}>
            <Show when={upcoming().length} fallback={<Empty>Nothing scheduled.</Empty>}>
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
            <h2>My courses</h2>
            <A href="/courses">View all</A>
          </div>
          <Show when={!myCourses.loading} fallback={<Loading />}>
            <Show
              when={myCourses()?.length}
              fallback={<Empty>Not enrolled in any course yet.</Empty>}
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
