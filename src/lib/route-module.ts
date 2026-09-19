/**
 * Which backend module a route's page is built on, by path prefix. A school
 * with that module switched off gets `403 {error, module}` from every call the
 * page would make, so the shell shows a "switched off" screen instead of
 * rendering a page that can only fail. Routes built on core surfaces (home,
 * calendar, users, settings, profile) map to nothing and always render.
 *
 * Longest prefix wins, so the `/management/*` and `/students/*` entries are
 * matched ahead of the shorter ones.
 */
const ROUTE_MODULES: ReadonlyArray<readonly [prefix: string, module: string]> = [
  ["/management/student-attendance", "attendance"],
  ["/management/student-marks", "marks"],
  ["/management/pomodoros", "pomodoro"],
  ["/management/payments", "payments"],
  ["/management/staff-work", "work"],
  ["/management/classes", "classes"],
  ["/students/attendance", "attendance"],
  ["/students/exams", "marks"],
  ["/students/study", "pomodoro"],
  // Note Studio works on course notes (lists them, runs RAG/podcast over them).
  ["/ai/studio", "course_notes"],
  ["/question-bank", "bank_questions"],
  ["/appointments", "appointments"],
  ["/whiteboards", "boards"],
  ["/attendance", "attendance"],
  ["/exam-room", "exams"],
  ["/questions", "questions"],
  ["/messages", "messages"],
  ["/homework", "homework"],
  ["/pomodoro", "pomodoro"],
  ["/payments", "payments"],
  ["/courses", "courses"],
  ["/studies", "courses"],
  ["/events", "events"],
  ["/clubs", "courses"],
  ["/exams", "exams"],
  ["/marks", "marks"],
  ["/meals", "meals"],
  ["/notes", "notes"],
  ["/work", "work"],
];

export function routeModule(pathname: string): string | null {
  let best: readonly [string, string] | null = null;
  for (const entry of ROUTE_MODULES) {
    const [prefix] = entry;
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!best || prefix.length > best[0].length)) best = entry;
  }
  return best?.[1] ?? null;
}
