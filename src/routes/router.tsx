import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  isRedirect,
  redirect,
} from "@tanstack/solid-router";
import { getMe } from "@/api/getMe";
import { hasMinRole } from "@/lib/roles";
import { ApiError } from "@/api/client";
import { Suspense, lazy, type Component } from "solid-js";
import { AppShell } from "@/components/layout/app-shell";
import { PageSpinner } from "@/components/ui/page-spinner";

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
const ExamsPage = lazyRoute(() => import("@/pages/exams-page"));
const ExamDetailPage = lazyRoute(() => import("@/pages/exam-detail-page"));
const ExamRoomPage = lazyRoute(() => import("@/pages/exam-room-page"));
const CoursesPage = lazyRoute(() => import("@/pages/courses-page"));
const CourseDetailPage = lazyRoute(() => import("@/pages/course-detail-page"));
const MarksPage = lazyRoute(() => import("@/pages/marks-page"));
const StudentMarksPage = lazyRoute(() => import("@/pages/student-marks-page"));
const AttendancePage = lazyRoute(() => import("@/pages/attendance-page"));
const StudentAttendancePage = lazyRoute(() => import("@/pages/student-attendance-page"));
const ProfilePage = lazyRoute(() => import("@/pages/profile-page"));
const LiveMonitorPage = lazyRoute(() => import("@/pages/live-monitor-page"));
const AdminUsersPage = lazyRoute(() => import("@/pages/admin-users-page"));
const SettingsPage = lazyRoute(() => import("@/pages/settings-page"));
const TermsPage = lazyRoute(() => import("@/pages/terms-page"));
const GuidePage = lazyRoute(() => import("@/pages/guide-page"));

function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
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

const coursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses",
  component: CoursesPage,
});

const courseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$id",
  component: CourseDetailPage,
});

const marksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marks",
  component: MarksPage,
});

const studentMarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/student-marks",
  beforeLoad: async () => {
    try {
      const user = await getMe();
      if (!hasMinRole(user.role, "teacher")) {
        throw redirect({ to: "/" });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw redirect({ to: "/login" });
      }
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: StudentMarksPage,
});

const attendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attendance",
  component: AttendancePage,
});

const studentAttendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/student-attendance",
  component: StudentAttendancePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/management/settings",
  component: SettingsPage,
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

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  beforeLoad: async () => {
    try {
      const user = await getMe();
      if (!hasMinRole(user.role, "admin")) {
        throw redirect({ to: "/" });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw redirect({ to: "/login" });
      }
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: AdminUsersPage,
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide",
  component: GuidePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  notesRoute,
  eventsRoute,
  eventDetailRoute,
  examDetailRoute,
  examRoomRoute,
  liveMonitorRoute,
  examsRoute,
  coursesRoute,
  courseDetailRoute,
  marksRoute,
  studentMarksRoute,
  attendanceRoute,
  studentAttendanceRoute,
  settingsRoute,
  termsRoute,
  profileRoute,
  adminUsersRoute,
  guideRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPendingComponent: PageSpinner,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}
