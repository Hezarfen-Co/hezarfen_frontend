import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/solid-router";
import { Suspense, createRenderEffect, createRoot, lazy, type Component } from "solid-js";
import { AppShell } from "@/components/layout/app-shell";
import { PageSpinner } from "@/components/ui/page-spinner";
import { AuthProvider } from "@/stores/auth-context";
import { PreferencesProvider } from "@/stores/preferences-context";

function lazyRoute(loader: () => Promise<{ default: Component }>): Component {
  const Page = lazy(loader);
  return function LazyRoutePage() {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Page />
      </Suspense>
    );
  };
}

const LoginPage = lazyRoute(() => import("@/pages/login-page"));
const RegisterPage = lazyRoute(() => import("@/pages/register-page"));
const DashboardPage = lazyRoute(() => import("@/pages/dashboard-page"));
const NotesPage = lazyRoute(() => import("@/pages/notes-page"));
const EventsPage = lazyRoute(() => import("@/pages/events-page"));
const EventDetailPage = lazyRoute(() => import("@/pages/event-detail-page"));
const HomeworkPage = lazyRoute(() => import("@/pages/homework-page"));
const HomeworkDetailPage = lazyRoute(() => import("@/pages/homework-detail-page"));
const ExamsPage = lazyRoute(() => import("@/pages/exams-page"));
const ExamDetailPage = lazyRoute(() => import("@/pages/exam-detail-page"));
const ExamRoomPage = lazyRoute(() => import("@/pages/exam-room-page"));
const QuestionBankPage = lazyRoute(() => import("@/pages/question-bank-page"));
const BankQuestionDetailPage = lazyRoute(() => import("@/pages/bank-question-detail-page"));
const CoursesPage = lazyRoute(() => import("@/pages/courses-page"));
const CourseDetailPage = lazyRoute(() => import("@/pages/course-detail-page"));
const ClassesPage = lazyRoute(() => import("@/pages/classes-page"));
const ClassDetailPage = lazyRoute(() => import("@/pages/class-detail-page"));
const MarksPage = lazyRoute(() => import("@/pages/marks-page"));
const MessagesPage = lazyRoute(() => import("@/pages/messages-page"));
const PomodoroPage = lazyRoute(() => import("@/pages/pomodoro-page"));
const StudentMarksPage = lazyRoute(() => import("@/pages/student-marks-page"));
const StudentPomodoroPage = lazyRoute(() => import("@/pages/student-pomodoro-page"));
const StudentAttendancePage = lazyRoute(() => import("@/pages/student-attendance-page"));
const WorkLogPage = lazyRoute(() => import("@/pages/work-log-page"));
const StaffWorkPage = lazyRoute(() => import("@/pages/staff-work-page"));
const LiveMonitorPage = lazyRoute(() => import("@/pages/live-monitor-page"));
const AdminUsersPage = lazyRoute(() => import("@/pages/admin-users-page"));
const AdminUserDetailPage = lazyRoute(() => import("@/pages/admin-user-detail-page"));
const SettingsPage = lazyRoute(() => import("@/pages/settings-page"));
const TermsPage = lazyRoute(() => import("@/pages/terms-page"));
const GuidePage = lazyRoute(() => import("@/pages/guide-page"));
const MyStudentsPage = lazyRoute(() => import("@/pages/my-students-page"));
const QuestionsPage = lazyRoute(() => import("@/pages/questions-page"));
const QuestionDetailPage = lazyRoute(() => import("@/pages/question-detail-page"));
const CalendarPage = lazyRoute(() => import("@/pages/calendar-page"));
const AppointmentsPage = lazyRoute(() => import("@/pages/appointments-page"));
const MealsPage = lazyRoute(() => import("@/pages/meals-page"));
const MealDetailPage = lazyRoute(() => import("@/pages/meal-detail-page"));
const PaymentsPage = lazyRoute(() => import("@/pages/payments-page"));
const ProfilePage = lazyRoute(() => import("@/pages/profile-page"));
const PaymentStatementPage = lazyRoute(() => import("@/pages/payment-statement-page"));
const WhiteboardsPage = lazyRoute(() => import("@/pages/whiteboards-page"));
const WhiteboardPage = lazyRoute(() => import("@/pages/whiteboard-page"));

function RootComponent() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </AuthProvider>
    </PreferencesProvider>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <div class="space-y-2 py-16 text-center">
      <p class="text-lg font-medium">404</p>
      <a href="/" class="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Home
      </a>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes",
  component: NotesPage,
});

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events",
  component: EventsPage,
});

const eventDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/$id",
  component: EventDetailPage,
});

const examsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exams",
  component: ExamsPage,
});

const homeworkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/homework",
  component: HomeworkPage,
});

const homeworkDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/homework/$id",
  component: HomeworkDetailPage,
});

const examDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exams/$id",
  component: ExamDetailPage,
});

const examRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exam-room/$id",
  component: ExamRoomPage,
});

const questionBankRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/question-bank",
  component: QuestionBankPage,
});

const bankQuestionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/question-bank/$id",
  component: BankQuestionDetailPage,
});

const coursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses",
  validateSearch: (search: Record<string, unknown>) => ({
    action: search.action === "new" ? "new" : undefined,
    kind: search.kind === "course" || search.kind === "study" || search.kind === "club" ? search.kind : undefined,
  }),
  component: CoursesPage,
});

const studiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/studies",
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/courses", search: { ...location.search, kind: "study" } as never });
  },
});

const clubsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clubs",
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/courses", search: { ...location.search, kind: "club" } as never });
  },
});

const courseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$id",
  component: CourseDetailPage,
});

const marksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marks",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "attendance" ? "attendance" as const : "marks" as const,
  }),
  component: MarksPage,
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: MessagesPage,
});

const pomodoroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pomodoro",
  component: PomodoroPage,
});

const studentMarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/student-marks",
  component: StudentMarksPage,
});

const studentPomodoroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/pomodoros",
  component: StudentPomodoroPage,
});

const attendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attendance",
  beforeLoad: () => {
    throw redirect({ to: "/marks", search: { tab: "attendance" } });
  },
});

const studentAttendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/student-attendance",
  component: StudentAttendancePage,
});

const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/work",
  component: WorkLogPage,
});

const staffWorkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/staff-work",
  component: StaffWorkPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/settings",
  component: SettingsPage,
});

const classesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/classes",
  component: ClassesPage,
});

const classDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/classes/$id",
  component: ClassDetailPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/terms",
  component: TermsPage,
});

const liveMonitorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exams/$id/live",
  component: LiveMonitorPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users/$id",
  component: AdminUserDetailPage,
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide",
  component: GuidePage,
});

// Declared (and registered) before the param route so the literal segment is
// never a candidate for $userId.
const myProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/me",
  component: ProfilePage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId",
  component: ProfilePage,
});

const myStudentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/students",
  component: MyStudentsPage,
});

const questionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions",
  component: QuestionsPage,
});

const questionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions/$id",
  component: QuestionDetailPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarPage,
});

const appointmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/appointments",
  component: AppointmentsPage,
});

const mealsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meals",
  component: MealsPage,
});

const mealDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meals/$id",
  component: MealDetailPage,
});

const paymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/payments",
  component: PaymentsPage,
});

const managedPaymentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/payments/$userId",
  component: PaymentsPage,
});

const paymentStatementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payments",
  component: PaymentStatementPage,
});

const whiteboardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/whiteboards",
  component: WhiteboardsPage,
});

const whiteboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/whiteboards/$id",
  component: WhiteboardPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  notesRoute,
  eventsRoute,
  eventDetailRoute,
  homeworkRoute,
  homeworkDetailRoute,
  examDetailRoute,
  examRoomRoute,
  liveMonitorRoute,
  examsRoute,
  questionBankRoute,
  bankQuestionDetailRoute,
  coursesRoute,
  studiesRoute,
  clubsRoute,
  courseDetailRoute,
  marksRoute,
  messagesRoute,
  pomodoroRoute,
  studentMarksRoute,
  studentPomodoroRoute,
  attendanceRoute,
  studentAttendanceRoute,
  workRoute,
  staffWorkRoute,
  settingsRoute,
  classesRoute,
  classDetailRoute,
  termsRoute,
  adminUsersRoute,
  adminUserDetailRoute,
  guideRoute,
  myStudentsRoute,
  questionsRoute,
  questionDetailRoute,
  calendarRoute,
  appointmentsRoute,
  mealsRoute,
  mealDetailRoute,
  paymentsRoute,
  managedPaymentDetailRoute,
  paymentStatementRoute,
  whiteboardsRoute,
  whiteboardRoute,
  myProfileRoute,
  userProfileRoute,
]);

function RouterPending() {
  return <div class="min-h-[var(--app-viewport)] bg-background" />;
}

export const router = createRouter({
  routeTree,
  defaultPendingComponent: RouterPending,
  defaultPreload: false,
  scrollRestoration: true,
});

// Workaround for a @tanstack/solid-router bug (present through v1.170.18):
// `useParams({ from })` reads a per-route match store that is a Solid memo
// living outside the component tree. When no component on that route is
// mounted (e.g. on the list page between two detail visits), the memo has no
// observers, misses the next navigation's update, and then serves the
// previous visit's params forever — detail pages showed the previously
// viewed record. A permanent subscription per param route keeps those memos
// observed so they always recompute. Remove once fixed upstream.
createRoot(() => {
  const paramRouteIds = Object.keys(router.routesById).filter((routeId) => routeId.includes("$"));
  for (const routeId of paramRouteIds) {
    createRenderEffect(() => {
      (router.stores.getRouteMatchStore as (id: string) => { get: () => unknown })(routeId).get();
    });
  }
});

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}
