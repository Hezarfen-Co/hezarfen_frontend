import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/solid-router";
import { Suspense, createRenderEffect, createRoot, lazy, type Component } from "solid-js";
import { AppShell } from "@/components/layout/app-shell";
import { NotFoundPage } from "@/components/system/not-found-page";
import { PageSpinner } from "@/components/ui/page-spinner";
import { AuthProvider } from "@/stores/auth-context";
import { ModulesProvider } from "@/stores/modules-context";
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
const NoteEditorPage = lazyRoute(() => import("@/pages/note-editor-page"));
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
const InstanceDetailPage = lazyRoute(() => import("@/pages/instance-detail-page"));
const AcademicYearsPage = lazyRoute(() => import("@/pages/academic-years-page"));
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
const ComingSoonPage = lazyRoute(() => import("@/pages/coming-soon-page"));
const StudentsRosterPage = lazyRoute(() => import("@/pages/students-roster-page"));
const TeachersRosterPage = lazyRoute(() => import("@/pages/teachers-roster-page"));
const LicenseModulesPage = lazyRoute(() => import("@/pages/license-modules-page"));
const BuilderLoginPage = lazyRoute(() => import("@/pages/builder-login-page"));
const BuilderSchoolsPage = lazyRoute(() => import("@/pages/builder-schools-page"));
const BuilderSchoolDetailPage = lazyRoute(() => import("@/pages/builder-school-detail-page"));

function RootComponent() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <ModulesProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </ModulesProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <NotFoundPage />,
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

const noteNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes/new",
  component: NoteEditorPage,
});

const noteDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes/$id",
  component: NoteEditorPage,
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

// A şube×ders instance: where exams, homework, lessons and the roster live.
const instanceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instances/$id",
  component: InstanceDetailPage,
});

const marksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marks",
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === "attendance"
        ? ("attendance" as const)
        : search.tab === "karne"
        ? ("karne" as const)
        : ("marks" as const),
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

const academicYearsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/academic-years",
  component: AcademicYearsPage,
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

const myStudentsAttendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/students/attendance",
  component: MyStudentsPage,
});

const myStudentsExamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/students/exams",
  component: MyStudentsPage,
});

const myStudentsStudyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/students/study",
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

const studentsRosterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/students",
  component: StudentsRosterPage,
});

const teachersRosterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/teachers",
  component: TeachersRosterPage,
});

const licenseModulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/modules",
  component: LicenseModulesPage,
});

// The vendor surface: a builder session, not a school user, so none of these
// render the school shell's sidebar (there is no school user to draw it for).
const builderLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/builder/login",
  component: BuilderLoginPage,
});

const builderSchoolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/builder",
  component: BuilderSchoolsPage,
});

const builderSchoolDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/builder/schools/$slug",
  component: BuilderSchoolDetailPage,
});

// One route per Figma menu entry with no backend yet — each gets its own URL
// (so breadcrumbs, back and direct links behave normally) but all render the
// same "not ready" page. Slugs are read back by coming-soon-page.tsx.
const COMING_SOON_SLUGS = [
  "hezarfen-zeka",
  "ses-atolyesi",
  "deneme-sinavlari",
  "optik-okuma",
  "raporlar",
  "kvkk-denetim",
  "ogrenci-analizi",
  "bekleyen-onaylar",
  "soru-uretimi",
  "calisma-programim",
] as const;

const comingSoonRoutes = COMING_SOON_SLUGS.map((slug) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: `/coming-soon/${slug}`,
    component: ComingSoonPage,
  }),
);

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  notesRoute,
  noteNewRoute,
  noteDetailRoute,
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
  instanceDetailRoute,
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
  academicYearsRoute,
  adminUsersRoute,
  adminUserDetailRoute,
  guideRoute,
  myStudentsRoute,
  myStudentsAttendanceRoute,
  myStudentsExamsRoute,
  myStudentsStudyRoute,
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
  studentsRosterRoute,
  teachersRosterRoute,
  licenseModulesRoute,
  builderLoginRoute,
  builderSchoolsRoute,
  builderSchoolDetailRoute,
  myProfileRoute,
  userProfileRoute,
  ...comingSoonRoutes,
]);

// Lazy route chunks load here; keep the spinner in the middle of the viewport
// instead of an empty page.
function RouterPending() {
  return (
    <div class="flex min-h-[calc(var(--app-viewport)-8rem)] items-center justify-center bg-background" role="status" aria-busy="true">
      <div class="h-9 w-9 animate-spin rounded-sm border-2 border-primary/20 border-t-primary" />
    </div>
  );
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
